// backend/server.js
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require('dotenv').config();

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;

if (!PAYMONGO_SECRET_KEY) {
    console.error("🔑 PAYMONGO_SECRET_KEY is missing!");
} else {
    console.log("🔑 Using PayMongo key:", PAYMONGO_SECRET_KEY?.slice(0, 10) + "...");
}

const app = express();
app.use(cors());
app.use(express.json());

app.post("/create-paymongo-checkout", async (req, res) => {
    try {
        const { amount, items, payment_method_types } = req.body;
        console.log("💬 Incoming request:", { amount, items });

        if (!amount || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid request payload" });
        }

        const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount,
                        currency: "PHP",
                        payment_method_types,
                        show_line_items: true,
                        show_description: true,
                        description: "Ely's Atsara Order", // ✅ ADD THIS LINE
                        line_items: items.map(item => ({
                            name: item.name,
                            amount: item.amount,
                            currency: "PHP",
                            quantity: item.quantity,
                            description: item.description || item.name // optional fallback
                        })),
                        success_url: "https://elysatsara.netlify.app/updatedcheckout/checkout.html?status=success",
                        cancel_url: "https://elysatsara.netlify.app/updatedcheckout/checkout.html?status=cancel"
                    }
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            const text = await response.text(); // fallback from .json()
            console.error("❌ PayMongo raw error:", text);
            return res.status(500).json({ error: "PayMongo failed", details: text });
        }


        res.json({ checkout_url: result.data.attributes.checkout_url });
    } catch (error) {
        console.error("❌ Server crashed:", error);
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

app.post('/calculate-distance', async (req, res) => {
    const { from, to } = req.body;

    if (!from || !to || !from.lon || !from.lat || !to.lon || !to.lat) {
        console.error("🚫 Invalid coordinates received:", { from, to });
        return res.status(400).json({ error: "Invalid coordinates" });
    }

    try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': process.env.ORS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [[from.lon, from.lat], [to.lon, to.lat]]
            })
        });

        const data = await response.json();

        if (!data.routes || !data.routes[0] || !data.routes[0].summary) {
            console.error("❌ ORS response invalid or empty:", data);
            return res.status(500).json({ error: "Invalid ORS response" });
        }

        const distanceMeters = data.routes[0].summary.distance;
        const distanceKm = distanceMeters / 1000;

        res.json({ distance_km: distanceKm });
    } catch (err) {
        console.error("ORS error:", err);
        res.status(500).json({ error: "Failed to calculate distance." });
    }
});



app.listen(3000, () => console.log("✅ Backend running at http://localhost:3000"));
