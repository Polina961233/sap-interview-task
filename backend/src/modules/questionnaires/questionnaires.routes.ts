import { Router } from "express";
import { requireBasicAuth } from "../auth/auth.middleware";
import {
  createQuestionnaireSchema,
  updateQuestionnaireSchema,
  submitAnswersSchema
} from "./questionnaires.schemas";
import {
  createQuestionnaire,
  getQuestionnaireWithEvidence,
  listQuestionnaires,
  updateQuestionnaire,
  submitQuestionnaireResponses
} from "./questionnaires.service";

export const questionnairesRouter = Router();

questionnairesRouter.use(requireBasicAuth);

questionnairesRouter.get("/", async (req, res, next) => {
  try {
    const list = await listQuestionnaires(req.user!.id);
    res.json(list);
  } catch (error) {
    next(error);
  }
});

questionnairesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createQuestionnaireSchema.parse(req.body);
    const questionnaire = await createQuestionnaire(
      req.user!.id,
      parsed.title,
      parsed.questions
    );
    res.status(201).json(questionnaire);
  } catch (error) {
    next(error);
  }
});

questionnairesRouter.put("/:id", async (req, res, next) => {
  try {
    const parsed = updateQuestionnaireSchema.parse(req.body);
    const questionnaire = await updateQuestionnaire(
      req.user!.id,
      req.params.id,
      parsed.title,
      parsed.questions
    );
    res.json(questionnaire);
  } catch (error) {
    next(error);
  }
});

questionnairesRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await getQuestionnaireWithEvidence(req.user!.id, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

questionnairesRouter.post("/:id/responses", async (req, res, next) => {
  try {
    const parsed = submitAnswersSchema.parse(req.body);
    const response = await submitQuestionnaireResponses(
      req.user!.id,
      req.params.id,
      parsed.answers
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});
