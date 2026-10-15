# ProductVault

ProductVault is a product management web application built with Node.js, Express.js, and SQLite.

## Features

- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- Product listing and pagination
- Product search and sorting
- Add, edit, and delete products
- Product image uploads
- SQLite database integration

## Technologies Used

- Node.js
- Express.js
- SQLite with better-sqlite3
- HTML, CSS, and JavaScript
- JSON Web Tokens (JWT)
- bcryptjs
- Multer

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Labonno2001/ProductVault.git
```

### 2. Open the project folder

```bash
cd ProductVault
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root and configure the required environment variables. Use your own secret values.

### 5. Start the application

```bash
npm run dev
```

### 6. Open the application

Visit `http://localhost:3000` in your browser.

## Security

Never upload `.env` files, authentication tokens, or databases containing private information to a public repository.

## Author

Labonno2001