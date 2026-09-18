import { z } from "zod";

const codeRule = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9\-]+$/, "Gunakan huruf kapital, angka, dan tanda minus.");

export const prospectSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  type: z.string().max(50).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().max(500).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  est_demand: z.coerce.number().min(0).default(0),
  est_demand_uom: z.string().max(20).default("MT"),
  score: z.coerce.number().min(0).max(100).default(0),
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"])
    .default("NEW"),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const operationalBaseSchema = z.object({
  code: codeRule,
  name: z.string().min(1).max(200),
  type: z.string().max(50).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().max(500).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  capacity: z.coerce.number().min(0).default(0),
  capacity_uom: z.string().max(20).default("MT"),
  operational_cost: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export const scenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  base_lat: z.coerce.number().min(-90).max(90),
  base_lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(1).max(500).default(50),
});

export type ProspectInput = z.infer<typeof prospectSchema>;
export type BaseInput = z.infer<typeof operationalBaseSchema>;
export type ScenarioInput = z.infer<typeof scenarioSchema>;