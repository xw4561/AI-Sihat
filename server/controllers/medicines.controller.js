import { supabase } from "../config/supabase.config.js";
import Joi from "joi";

// Joi schema
const medicineSchema = Joi.object({
  medicine_name: Joi.string().required(),
  medicine_type: Joi.string().required(),
  medicine_quantity: Joi.number().integer().required(),
});

// Validation middleware
export const validateMedicine = (req, res, next) => {
  const { error } = medicineSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// Controller functions
export const createMedicine = async (req, res) => {
  try {
    const { medicine_name, medicine_type, medicine_quantity } = req.body;
    const { data, error } = await supabase
      .from("medicine")
      .insert([{ medicine_name, medicine_type, medicine_quantity }]);
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllMedicines = async (req, res) => {
  try {
    const { data, error } = await supabase.from("medicine").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


