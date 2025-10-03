-- V3__Create_Profile_And_Token_Schema.sql

CREATE TABLE verification_tokens
(
    id          UUID PRIMARY KEY,
    token       VARCHAR(255) NOT NULL UNIQUE,
    user_id     UUID         NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE refresh_tokens
(
    id          UUID PRIMARY KEY,
    token       VARCHAR(255) NOT NULL UNIQUE,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);