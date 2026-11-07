CREATE TABLE "LtiNonce" (
    "consumerKey" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "timestampSec" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("consumerKey", "nonce")
);

CREATE INDEX "LtiNonce_timestampSec_idx" ON "LtiNonce"("timestampSec");
