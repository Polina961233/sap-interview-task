import { embedText } from "../../lib/embedding";
import { pool, withTx } from "../../lib/db";
import { HttpError } from "../../lib/errors";
import { config } from "../../lib/config";
import { qdrant } from "../../lib/qdrant";

export type QuestionInput = {
  prompt: string;
  answerType: "text" | "number";
  regex?: string | null;
};

export async function createQuestionnaire(
  userId: string,
  title: string,
  questions: QuestionInput[]
) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    throw new HttpError(400, "Title is required");
  }

  const existing = await pool.query(
    "SELECT id FROM questionnaires WHERE lower(title) = lower($1) AND created_by = $2",
    [normalizedTitle, userId]
  );

  if (existing.rowCount) {
    throw new HttpError(409, "Questionnaire title already exists");
  }

  return withTx(async (client) => {
    const q = await client.query(
      `INSERT INTO questionnaires (title, created_by)
       VALUES ($1, $2)
       RETURNING id, title, created_at`,
      [normalizedTitle, userId]
    );

    const questionnaire = q.rows[0];

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      await client.query(
        `INSERT INTO questions (questionnaire_id, prompt, answer_type, regex, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          questionnaire.id,
          question.prompt,
          question.answerType,
          question.regex || null,
          i
        ]
      );
    }

    return questionnaire;
  });
}

export async function updateQuestionnaire(
  userId: string,
  questionnaireId: string,
  title: string,
  questions: QuestionInput[]
) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    throw new HttpError(400, "Title is required");
  }

  const current = await pool.query(
    "SELECT id FROM questionnaires WHERE id = $1 AND created_by = $2",
    [questionnaireId, userId]
  );

  if (!current.rowCount) {
    throw new HttpError(404, "Questionnaire not found");
  }

  const duplicate = await pool.query(
    "SELECT id FROM questionnaires WHERE lower(title) = lower($1) AND id <> $2 AND created_by = $3",
    [normalizedTitle, questionnaireId, userId]
  );

  if (duplicate.rowCount) {
    throw new HttpError(409, "Questionnaire title already exists");
  }

  return withTx(async (client) => {
    const updated = await client.query(
      `UPDATE questionnaires
       SET title = $1
       WHERE id = $2
       RETURNING id, title, created_at`,
      [normalizedTitle, questionnaireId]
    );

    await client.query("DELETE FROM questions WHERE questionnaire_id = $1", [
      questionnaireId
    ]);

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      await client.query(
        `INSERT INTO questions (questionnaire_id, prompt, answer_type, regex, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          questionnaireId,
          question.prompt,
          question.answerType,
          question.regex || null,
          i
        ]
      );
    }

    return updated.rows[0];
  });
}

export async function listQuestionnaires(userId: string) {
  const result = await pool.query(
    `SELECT id, title, created_at
     FROM questionnaires
     WHERE created_by = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getQuestionnaireWithEvidence(userId: string, questionnaireId: string) {
  const questionnaire = await pool.query(
    "SELECT id, title, created_at FROM questionnaires WHERE id = $1 AND created_by = $2",
    [questionnaireId, userId]
  );

  if (!questionnaire.rowCount) {
    throw new HttpError(404, "Questionnaire not found");
  }

  const questionsResult = await pool.query(
    `SELECT id, prompt, answer_type, regex, position
     FROM questions
     WHERE questionnaire_id = $1
     ORDER BY position ASC`,
    [questionnaireId]
  );

  const questions = [];

  for (const row of questionsResult.rows) {
    const vector = await embedText(row.prompt);
    const search = await qdrant.search(config.qdrantCollection, {
      vector,
      limit: 5,
      score_threshold: 0.35
    });

    const evidence = search.map((hit: any) => ({
      id: String(hit.id),
      score: hit.score,
      fileName: hit.payload?.fileName,
      snippet: hit.payload?.text,
      mimeType: hit.payload?.mimeType
    }));

    questions.push({
      id: row.id,
      prompt: row.prompt,
      answerType: row.answer_type,
      regex: row.regex,
      evidence
    });
  }

  return {
    ...questionnaire.rows[0],
    questions
  };
}

export async function submitQuestionnaireResponses(
  userId: string,
  questionnaireId: string,
  answers: { questionId: string; value: string }[]
) {
  if (!answers.length) {
    throw new HttpError(400, "At least one answer is required");
  }

  const questionnaire = await pool.query(
    "SELECT id FROM questionnaires WHERE id = $1 AND created_by = $2",
    [questionnaireId, userId]
  );

  if (!questionnaire.rowCount) {
    throw new HttpError(404, "Questionnaire not found");
  }

  const questionsResult = await pool.query(
    `SELECT id, answer_type, regex
     FROM questions
     WHERE questionnaire_id = $1`,
    [questionnaireId]
  );

  if (!questionsResult.rowCount) {
    throw new HttpError(404, "Questionnaire not found or has no questions");
  }

  const questionMap = new Map(
    questionsResult.rows.map((q) => [q.id, q as { id: string; answer_type: string; regex: string | null }])
  );

  if (answers.length !== questionMap.size) {
    throw new HttpError(
      400,
      "All questionnaire questions must be answered before submission"
    );
  }

  const seen = new Set<string>();

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw new HttpError(400, `Unknown question id: ${answer.questionId}`);
    }

    if (seen.has(answer.questionId)) {
      throw new HttpError(400, `Duplicate answer for question ${answer.questionId}`);
    }
    seen.add(answer.questionId);

    if (!answer.value.trim()) {
      throw new HttpError(400, `Question ${answer.questionId} requires an answer`);
    }

    if (question.answer_type === "number" && Number.isNaN(Number(answer.value))) {
      throw new HttpError(400, `Question ${answer.questionId} expects a numeric value`);
    }

    if (question.regex) {
      const re = new RegExp(question.regex);
      if (!re.test(answer.value)) {
        throw new HttpError(
          400,
          `Answer for question ${answer.questionId} does not match regex`
        );
      }
    }
  }

  const response = await withTx(async (client) => {
    const insertedResponse = await client.query(
      `INSERT INTO responses (questionnaire_id, user_id)
       VALUES ($1, $2)
       RETURNING id, created_at`,
      [questionnaireId, userId]
    );

    for (const answer of answers) {
      await client.query(
        `INSERT INTO response_answers (response_id, question_id, value)
         VALUES ($1, $2, $3)`,
        [insertedResponse.rows[0].id, answer.questionId, answer.value]
      );
    }

    return insertedResponse.rows[0];
  });

  return response;
}
