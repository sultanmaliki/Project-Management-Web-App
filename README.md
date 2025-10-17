# ProjectFlow - A Full-Stack Project Management Tool

ProjectFlow is a modern, full-stack project management application designed to streamline your workflow and enhance team collaboration. With an intuitive user interface and a powerful backend, ProjectFlow provides a comprehensive solution for managing projects, tasks, and users. The application features a real-time dashboard, a Kanban-style project board, and an AI-powered user story generator to help you kickstart your projects.

## ✨ Features

* **Dashboard Overview:** Get a quick glance at your projects, tasks, and team statistics.
* **Kanban-Style Project Board:** Visualize your workflow with a drag-and-drop interface for managing tasks.
* **User and Role Management:** Assign roles to users (Admin, Manager, Developer) to control permissions and access.
* **AI-Powered User Story Generator:** Automatically generate user stories from a project description to save time and effort.
* **Responsive Design:** Access and manage your projects on any device, thanks to a fully responsive layout.
* **Modern Tech Stack:** Built with a modern and robust tech stack, ensuring a high-performance and scalable application.

## 🛠️ Tech Stack

### Frontend

* **React:** A JavaScript library for building user interfaces.
* **Vite:** A fast and modern build tool for web development.
* **TypeScript:** A statically typed superset of JavaScript that adds optional types.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **shadcn/ui:** A collection of re-usable components built with Radix UI and Tailwind CSS.
* **Lucide React:** A library of beautiful and consistent icons.
* **Recharts:** A composable charting library built on React components.

### Backend

* **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python.
* **PostgreSQL:** A powerful, open-source object-relational database system.
* **SQLAlchemy:** A SQL toolkit and Object-Relational Mapper (ORM) for Python.
* **Groq:** An AI-powered service used for generating user stories.
* **Passlib:** A password hashing library for Python.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* **Node.js:** Make sure you have Node.js and npm installed.
* **Python:** Ensure you have Python and pip installed.
* **PostgreSQL:** You need a running instance of PostgreSQL.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/projectflow.git](https://github.com/your-username/projectflow.git)
    cd projectflow
    ```
2.  **Frontend Setup:**
    * Navigate to the `frontend` directory.
    * Install the dependencies:
        ```sh
        npm install
        ```
    * Start the development server:
        ```sh
        npm run dev
        ```
3.  **Backend Setup:**
    * Navigate to the `backend` directory.
    * Create a virtual environment and install the dependencies:
        ```sh
        python -m venv venv
        source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
        pip install -r requirements.txt
        ```
    * Set up your environment variables by creating a `.env` file and adding your Groq API key:
        ```
        GROQ_API_KEY="your-groq-api-key"
        ```
    * Start the backend server:
        ```sh
        uvicorn app.main:app --reload
        ```

### Usage

Once both the frontend and backend servers are running, you can access the application at `http://localhost:3000`.

* **Admin:** `admin@projectflow.com` / `admin123`
* **Manager:** `manager@projectflow.com` / `manager123`
* **Developer:** `dev@projectflow.com` / `dev123`

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
