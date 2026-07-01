import {expect,describe, it} from 'vitest';

import request from 'supertest';

import app from '../src/app.js'

describe('checks that health endpoints works correctly',() => {
    it("checks if /health returns status code 200", async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({status:'ok'});
    })
})