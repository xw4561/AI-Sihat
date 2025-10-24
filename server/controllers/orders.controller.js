import { supabase } from "../config/supabase.config.js";
import Joi from "joi";

// Joi schema
const orderSchema = Joi.object({
  user_id: Joi.number().integer().required(),
  medicine_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().required(),
  ai_consultation: Joi.boolean().optional(), // double points if true
});

// Validation middleware
export const validateOrder = (req, res, next) => {
  const { error } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

// Controller functions
export const createOrder = async (req, res) => {
  try {
    const { user_id, medicine_id, quantity, ai_consultation } = req.body;

    const points = ai_consultation ? quantity * 2 : quantity;

    const { data, error } = await supabase
      .from("orders")
      .insert([{ user_id, medicine_id, quantity, points }]);

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { data, error } = await supabase.from("orders").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

