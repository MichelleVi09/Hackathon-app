import { Router } from "express";
import { requestJson } from "../services/httpClient.js";

const router = Router();
const burnoutServiceUrl = process.env.BURNOUT_SERVICE_URL ?? "http://127.0.0.1:5001";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getFallbackBurnRate(payload = {}) {
  const fatigue = Number(payload.mental_fatigue_score ?? 0) / 10;
  const hours = clamp(Number(payload.hours_worked ?? 0) / 12, 0, 1);
  const designation = clamp(Number(payload.designation ?? 0) / 5, 0, 1);
  const resources = clamp(Number(payload.resource_allocation ?? 5) / 10, 0, 1);
  const setupPenalty = Number(payload.wfh_setup_available ?? 1) ? 0 : 0.08;

  const burnRate = clamp(
    0.45 * fatigue + 0.25 * hours + 0.1 * designation + 0.12 * resources + setupPenalty,
    0,
    1
  );

  return Number(burnRate.toFixed(2));
}

router.post("/predict", async (req, res) => {
  const payload = req.body ?? {};

  try {
    const data = await requestJson(`${burnoutServiceUrl}/predict`, {
      method: "POST",
      body: JSON.stringify(payload),
      timeout: 5000
    });

    const burnRate = Number(data.burn_rate ?? data.prediction ?? data.result ?? 0);
    return res.json({
      source: data.model_source ?? "burnout-service",
      burn_rate: clamp(Number.isFinite(burnRate) ? burnRate : 0, 0, 1),
      trained_on_records: data.trained_on_records ?? null,
      training_mae: data.training_mae ?? null,
      training_r2: data.training_r2 ?? null,
      ethics: data.ethics ?? null
    });
  } catch (error) {
    return res.json({
      source: "wellby-fallback",
      burn_rate: getFallbackBurnRate(payload),
      warning: "Burnout microservice unavailable. Using local fallback estimate."
    });
  }
});

export default router;
