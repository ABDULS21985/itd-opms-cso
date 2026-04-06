-- +goose Up
-- Migration 080: Ticket ↔ KB Article linkage (ESM BRD requirement)
-- Enables linking knowledge base articles to tickets as references,
-- workarounds, or resolutions from within incident management screens.

CREATE TABLE ticket_kb_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    article_id  UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    linked_by   UUID NOT NULL REFERENCES users(id),
    link_type   TEXT NOT NULL DEFAULT 'reference'
                CHECK (link_type IN ('reference', 'resolution', 'workaround')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ticket_id, article_id)
);

CREATE INDEX idx_ticket_kb_ticket  ON ticket_kb_links(ticket_id);
CREATE INDEX idx_ticket_kb_article ON ticket_kb_links(article_id);

-- +goose Down
DROP TABLE IF EXISTS ticket_kb_links;
