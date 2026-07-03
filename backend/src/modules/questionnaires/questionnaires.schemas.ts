import { z } from "zod";

export const questionSchema = z.object({
  prompt: z.string().min(1),
  answerType: z.enum(["text", "number"]),
  regex: z
    .string()
    .optional()
    .nullable()
    .refine((value) => {
      if (!value) {
        return true;
      }

      try {
        new RegExp(value);
        return true;
      } catch {
        return false;
      }
    }, "Invalid regex pattern")
});

export const createQuestionnaireSchema = z.object({
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1)
});

export const updateQuestionnaireSchema = createQuestionnaireSchema;

export const submitAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      value: z.string()
    })
  )
});
