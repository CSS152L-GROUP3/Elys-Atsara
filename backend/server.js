// backend/server.js
const express = require("express");
const fetch = require("node-fetch"); // make sure this is installed: npm install node-fetch
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PAYMONGO_SECRET = "sk_test_3zgmJysSqCF1Fhim4grdLKup"; // ✅ use your working secret key

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
                Authorization: `Basic ${Buffer.from("sk_test_3zgmJysSqCF1Fhim4grdLKup" + ":").toString("base64")}`,
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
                        success_url: "http://localhost:5500/updatedCheckout/Checkout.html?status=success",
                        cancel_url: "http://localhost:5500/updatedCheckout/Checkout.html?status=cancel"
                    }
                }
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("❌ PayMongo API Error:", result);
            return res.status(500).json({ error: "PayMongo failed", details: result });
        }

        res.json({ checkout_url: result.data.attributes.checkout_url });
    } catch (error) {
        console.error("❌ Server crashed:", error);
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});



app.listen(3000, () => console.log("✅ Backend running at http://localhost:3000"));
