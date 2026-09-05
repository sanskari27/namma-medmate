-- M8-S02 expense posting status (D-004: record posts immediately)
ALTER TABLE expense
    ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'POSTED';

ALTER TABLE expense
    ADD CONSTRAINT chk_expense_status
        CHECK (status IN ('PENDING', 'POSTED', 'REJECTED'));
