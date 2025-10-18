# ProjectFlow - A Full-Stack Project Management Tool

![GitHub repo size](https://img.shields.io/github/repo-size/sultanmaliki/Project-Management-Web-App)
![GitHub stars](https://img.shields.io/github/stars/sultanmaliki/Project-Management-Web-App?style=social)
![GitHub forks](https://img.shields.io/github/forks/sultanmaliki/Project-Management-Web-App?style=social)

ProjectFlow is a modern, full-stack project management application designed to streamline your workflow and enhance team collaboration. With an intuitive user interface and a powerful backend, ProjectFlow provides a comprehensive solution for managing projects, tasks, and users. The application features a real-time dashboard, a Kanban-style project board, and an AI-powered user story generator to help you kickstart your projects.

## ✨ Features

*   **Dashboard Overview:** Get a quick glance at your projects, tasks, and team statistics.
*   **Kanban-Style Project Board:** Visualize your workflow with a drag-and-drop interface for managing tasks.
*   **User and Role Management:** Assign roles to users (Admin, Manager, Developer) to control permissions and access.
*   **AI-Powered User Story Generator:** Automatically generate user stories from a project description to save time and effort.
*   **Responsive Design:** Access and manage your projects on any device, thanks to a fully responsive layout.
*   **Modern Tech Stack:** Built with a modern and robust tech stack, ensuring a high-performance and scalable application.

## 🛠️ Tech Stack

### Frontend

*   **React:** A JavaScript library for building user interfaces.
*   **Vite:** A fast and modern build tool for web development.
*   **TypeScript:** A statically typed superset of JavaScript that adds optional types.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
*   **shadcn/ui:** A collection of re-usable components built with Radix UI and Tailwind CSS.
*   **Lucide React:** A library of beautiful and consistent icons.
*   **Recharts:** A composable charting library built on React components.

### Backend

*   **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python.
*   **PostgreSQL:** A powerful, open-source object-relational database system.
*   **SQLAlchemy:** A SQL toolkit and Object-Relational Mapper (ORM) for Python.
*   **Groq:** An AI-powered service used for generating user stories.
*   **Passlib:** A password hashing library for Python.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have Node.js, Python, and PostgreSQL installed on your system. Here’s how you can install them on different operating systems:

#### Node.js

*   **All Systems:** Download the installer from the official [Node.js website](https://nodejs.org/).

#### Python

*   **All Systems:** Download the installer from the official [Python website](https://www.python.org/downloads/).

#### PostgreSQL

*   **macOS (using Homebrew):**
    ```sh
    brew install postgresql
    ```
*   **Linux (using apt on Debian/Ubuntu):**
    ```sh
    sudo apt update
    sudo apt install postgresql postgresql-contrib
    ```
*   **Windows:** Download the installer from the official [PostgreSQL website](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/sultanmaliki/Project-Management-Web-App.git
    cd Project-Management-Web-App
    ```

2.  **Frontend Setup:**
    *   Navigate to the `frontend` directory:
        ```sh
        cd frontend
        ```
    *   Install the dependencies:
        ```sh
        npm install
        ```
    *   Start the development server:
        ```sh
        npm run dev
        ```

3.  **Backend Setup:**
    *   Navigate to the `backend` directory:
        ```sh
        cd backend
        ```
    *   Create a virtual environment:
        ```sh
        python -m venv venv
        ```
    *   Activate the virtual environment:
        *   **macOS/Linux:**
            ```sh
            source venv/bin/activate
            ```
        *   **Windows:**
            ```sh
            venv\Scripts\activate
            ```
    *   Install the dependencies:
        ```sh
        pip install -r requirements.txt
        ```
    *   Set up your environment variables by creating a `.env` file in the `backend` directory and adding your Groq API key:
        ```
        GROQ_API_KEY="your-groq-api-key"
        ```
    *   Start the backend server:
        ```sh
        uvicorn app.main:app --reload
        ```

### Usage

Once both the frontend and backend servers are running, you can access the application at `http://localhost:5173`.

Here are the default credentials for different roles:

*   **Admin:** `admin@projectflow.com` / `admin123`
*   **Manager:** `manager@projectflow.com` / `manager123`
*   **Developer:** `dev@projectflow.com` / `dev123`

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
