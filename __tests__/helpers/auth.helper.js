import request from "supertest";
import app from "../../app.js";
export const getAuthToken = async () => {
  const uniqueUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: "password123",
  };

  await request(app).post("/api/auth/register").send(uniqueUser).expect(201);

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueUser.email,
      password: uniqueUser.password,
    })
    .expect(200);

  return loginResponse.body.accessToken;
};
