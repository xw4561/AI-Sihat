import { supabase } from "../config/supabase.config.js";
import Joi from "joi";

const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
});

// Validation middleware
export const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// Controller functions
export const createUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const { data, error } = await supabase.from("users").insert([{ name, email }]);
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

