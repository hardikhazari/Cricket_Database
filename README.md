# 🏏 CricPulse a cricket Web Application

A full-stack web application that showcases structured cricket data including rankings, player stats, team information, and match schedules. The system supports secure user authentication, automated email notifications, and a MySQL-backed REST API for dynamic data rendering.

--- 

## 📌 Features

- 📊 **Dedicated Pages**: For teams, players, and series with detailed statistics and filters
- 🏆 **Rankings Across Formats**: Supports Test, ODI, and T20 player and team rankings
- 📅 **Match Schedule Viewer**: Users can explore match schedules by series or tournaments
- 🔐 **User Authentication**:
  - Manual login/signup system
  - Google OAuth Sign-In
- 📧 **Email Workflows**:
  - Login confirmation
  - Subscription/payment confirmation
- 🧾 **REST API Endpoints**:
  - Rankings, players by team, series/tournaments, match schedule, etc.

---

## 🧱 Tech Stack

| Layer         | Technology                                    |
|---------------|-----------------------------------------------|
| **Frontend**  | HTML, CSS, JavaScript                         |
| **Backend**   | Node.js, Express                              |
| **Database**  | MySQL (normalized schema, manually curated)   |
| **Email**     | Nodemailer (Gmail SMTP)                       |
| **Auth**      | Google OAuth + Manual Login                   |

---

## 🛠️ Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/hardikhazari/cricpulse_app.git
cd cricpulse_app
```
### 2. Folder Structure
cricpulse_app/
│
├── client/             # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── rankings.html
│   └── ... (other pages)
│
├── server/             # Backend code (Node.js + Express)
│   ├── server.js
│   ├── .env
│   ├── package.json
│   └── ...

### 3. Install Backend Dependencies
cd server
npm install



## Screenshots

![Screenshot 1](Photos/Screenshot%202026-06-02%20155719.png)
![Screenshot 2](Photos/Screenshot%202026-06-02%20155854.png)
![Screenshot 3](Photos/Screenshot%202026-06-02%20155923.png)
![Screenshot 4](Photos/Screenshot%202026-06-02%20155936.png)
![Screenshot 5](Photos/Screenshot%202026-06-02%20160016.png)
