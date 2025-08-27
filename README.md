# ⚡ SolarPay – Smart IoT Solar Pay-As-You-Go System

🌞 **Powering Africa with IoT + Pay-As-You-Go Solar**  
Built at the **Africa’s Talking Women in Tech Hackathon 2025** ✨  

![SolarPay Banner](https://img.shields.io/badge/IoT-SolarPay-yellow?style=for-the-badge)  
![Hackathon](https://img.shields.io/badge/Hackathon-Africa's%20Talking-blueviolet?style=for-the-badge)  
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)  

---

## 🌍 Problem
Millions of households in Africa use small solar systems but:  
- ⚠️ Don’t know when their battery will die (sudden blackouts).  
- 💸 Struggle with flexible, affordable payment methods.  
- 📵 Lack access to internet — only feature phones available.  

---

## 💡 Our Solution: **SolarPay**
✅ IoT-powered battery monitoring  
✅ Affordable **Pay-As-You-Go energy** with Airtime  
✅ **USSD & SMS access** (works even on Kabambe phones)  
✅ Visual hardware demo: light bulb ON/OFF after payment  

---

## ✨ Features
- 🔋 **Battery Monitoring** → ESP32 + sensors track solar battery status.  
- 📱 **USSD/SMS Menu** → Users dial `*123#` to check power status.  
- 💰 **Pay-As-You-Go with Airtime API** → Unlock power for small payments.  
- 💡 **Relay-Controlled Demo Load** → Light bulb switches ON/OFF after recharge.  
- ☎️ **Optional Voice Alerts** → For accessibility.  

---

## 🛠️ Tech Stack
**Hardware** ⚡  
- ESP32 microcontroller  
- Voltage Sensor + Current Sensor  
- Relay Module + Light Bulb  

**Backend** 🖥️  
- Node.js + Express  

**Database** 🗄️  
- Firebase Realtime Database  

**Africa’s Talking APIs** 📡  
- SMS API → Battery alerts  
- USSD API → Interactive menu  
- Airtime API → Pay-As-You-Go payments  
- Voice API → Optional status calls  

---

## 🏗️ System Architecture
```mermaid
flowchart LR
    A[Solar Panel + Battery] --> B[ESP32 + Sensors]
    B --> C[Relay + Bulb 💡]
    B --> D[Backend - Node.js + Express]
    D --> E[Firebase Realtime DB 🗄️]
    D --> F[Africa's Talking APIs]
    F --> G[User Phone 📱 (SMS/USSD/Airtime)]
    G --> F

# Africa-s-Talking-Solarpay-Hackathon
