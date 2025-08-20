# Real-Time Chat Application

This project is a feature-rich, scalable instant messaging application built with Node.js, Socket.IO, MongoDB, Redis, RabbitMQ, and Elasticsearch.

## ✨ Core Features

- **User Management:** Secure user registration and login based on JWT (JSON Web Token).
- **Instant Messaging:** Room-based, one-on-one real-time communication using Socket.IO.
- **Message Read Receipts:** Tracking when a sent message has been read by the recipient.
- **"Typing..." Indicator:** Real-time notification showing when the other user is typing.
- **Online Status Tracking:** Tracking which users are currently active using Redis.
- **Advanced Message Search:** Fast and flexible (typo-tolerant) search within message content using Elasticsearch.
- **Automated Message System:** A background-running infrastructure for sending scheduled or triggered automatic messages using RabbitMQ and Cron Jobs.
- **RESTful API:** Comprehensive API endpoints for managing users, conversations, and other data.
- **Containerized Infrastructure:** Easy setup of all services (Application, MongoDB, Redis, RabbitMQ, Elasticsearch, Kibana) using Docker and Docker Compose.

## 🛠️ Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Real-Time Communication:** Socket.IO
- **Caching & Pub/Sub:** Redis
- **Message Queue:** RabbitMQ
- **Search & Indexing:** Elasticsearch
- **Data Visualization:** Kibana
- **Authentication:** JSON Web Tokens (JWT)
- **Containerization:** Docker, Docker Compose
- **Logging:** Winston, Morgan
- **Scheduled Tasks:** Node-Cron

## 🚀 Getting Started

Follow the steps below to run the project on your local machine.

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the project:**

    ```bash
    git clone <repository-url>
    cd realtime-chat
    ```

2.  **Create the `.env` file:**
    Create a file named `.env` in the project's root directory and paste the following content. You can change the values in this file according to your own configuration.

    ```env
    # Database
    MONGO_URI=mongodb://admin:password123@localhost:27017/realtime_chat?authSource=admin

    # JWT Secrets
    JWT_SECRET=dev-jwt-key-123
    JWT_ACCESS_SECRET=dev-access-secret-456
    JWT_REFRESH_SECRET=dev-refresh-secret-789
    JWT_EXPIRE=7d
    JWT_ACCESS_EXPIRE=1h
    JWT_REFRESH_EXPIRE=7d

    # Redis
    REDIS_URL=redis://localhost:6379
    REDIS_CACHE_TTL=3600

    # RabbitMQ
    RABBITMQ_URL=amqp://user:password@localhost:5672

    # Elasticsearch
    ELASTICSEARCH_URL=http://localhost:9200

    # Server
    PORT=3000
    NODE_ENV=development

    # Client
    CLIENT_URL=http://localhost:3000
    ```

3.  **Start the Docker containers:**
    Run the following command in the project's root directory. This command will build an image for your application from the `Dockerfile` and start all the services defined in the `docker-compose.yaml` file.

    ```bash
    docker-compose up --build
    ```

    Once all services have started successfully, your application will be ready to run.

### Seeding the Database

To test the application, you can populate the database with sample users and messages. Open a new terminal and run the following command:

```bash
docker-compose exec app node scripts/seed.js
```

This command runs the `seed.js` script inside the running `app` container.

## 🌐 Services and Interfaces

When the project is up and running, you can access the respective services at the following addresses:

- **Application API:** `http://localhost:3000`
- **RabbitMQ Management UI:** `http://localhost:15672` (Username: `user`, Password: `password`)
- **Kibana (Elasticsearch UI):** `http://localhost:5601`

## 📝 API Endpoints

All endpoints use the `requireAuth` middleware and therefore require an `Authorization: Bearer <ACCESS_TOKEN>` header.

### Auth (`/api/auth`)

- `POST /register`: Register a new user.
- `POST /login`: Log in a user and receive tokens.
- `POST /logout`: Log out a user (deletes the refresh token, blacklists the access token).
- `GET /me`: Returns the information of the logged-in user.

### Users (`/api/users`)

- `GET /`: Lists all users.
- `GET /online-users`: Lists the IDs of online users.
- `GET /:userId`: Retrieves the profile of the user with the specified ID.
- `GET /:userId/conversations`: Retrieves all conversations the user is a part of.

### Search (`/api/search`)

- `GET /messages?q=<search_term>`: Searches within message content.
  - Example: `GET http://localhost:3000/api/search/messages?q=hello`

## 🔌 Socket.IO Events

For a socket connection, the token must be sent with the `auth: { token: "YOUR_ACCESS_TOKEN" }` option.

### Client to Server (Client -> Server)

- `join_room (roomName)`: Joins the user to the specified chat room.
- `send_message ({ roomName, message, receiverId })`: Sends a message to the specified room.
- `message_read ({ roomName, messageId })`: Marks the specified message as read.
- `start_typing ({ roomName })`: Initiates the "typing..." status.
- `stop_typing ({ roomName })`: Ends the "typing..." status.

### Server to Client (Server -> Client)

- `user_online ({ userId })`: Broadcast to all clients when a user comes online.
- `user_offline ({ userId })`: Broadcast to all clients when a user goes offline.
- `message_received ({ message, senderId, messageId })`: Broadcast to a room when a new message arrives.
- `message_was_read ({ messageId, readerId })`: Broadcast to a room when a message is marked as read.
- `user_typing ({ userId })`: Broadcast to a room when a user starts typing.
- `user_stopped_typing ({ userId })` Broadcast to a room when a user stops typing.
- `error ({ message })`: Sent to the respective client when an error occurs.
