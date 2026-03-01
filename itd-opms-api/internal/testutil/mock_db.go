package testutil

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBTX is the interface that pgx pool connections satisfy. Services can depend
// on this interface instead of *pgxpool.Pool to enable unit testing with mocks.
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// MockRow implements pgx.Row for single-row query mocking.
type MockRow struct {
	ScanFunc func(dest ...interface{}) error
}

// Scan delegates to ScanFunc.
func (r *MockRow) Scan(dest ...interface{}) error {
	if r.ScanFunc != nil {
		return r.ScanFunc(dest...)
	}
	return nil
}

// MockRows implements pgx.Rows for multi-row query mocking.
type MockRows struct {
	data    [][]interface{}
	current int
	closed  bool
	err     error
}

// NewMockRows creates a MockRows with the given data.
func NewMockRows(data [][]interface{}) *MockRows {
	return &MockRows{data: data, current: -1}
}

func (r *MockRows) Next() bool {
	if r.closed || r.err != nil {
		return false
	}
	r.current++
	return r.current < len(r.data)
}

func (r *MockRows) Scan(dest ...interface{}) error {
	if r.current < 0 || r.current >= len(r.data) {
		return pgx.ErrNoRows
	}
	row := r.data[r.current]
	for i, d := range dest {
		if i < len(row) {
			switch ptr := d.(type) {
			case *string:
				if v, ok := row[i].(string); ok {
					*ptr = v
				}
			case *int:
				if v, ok := row[i].(int); ok {
					*ptr = v
				}
			case *int64:
				if v, ok := row[i].(int64); ok {
					*ptr = v
				}
			case *bool:
				if v, ok := row[i].(bool); ok {
					*ptr = v
				}
			}
		}
	}
	return nil
}

func (r *MockRows) Close()                        { r.closed = true }
func (r *MockRows) Err() error                    { return r.err }
func (r *MockRows) CommandTag() pgconn.CommandTag  { return pgconn.NewCommandTag("SELECT 0") }
func (r *MockRows) FieldDescriptions() []pgconn.FieldDescription { return nil }
func (r *MockRows) RawValues() [][]byte            { return nil }
func (r *MockRows) Values() ([]interface{}, error) { return nil, nil }
func (r *MockRows) Conn() *pgx.Conn               { return nil }

// MockDB is a mock implementation of DBTX for testing.
type MockDB struct {
	ExecFunc     func(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
	QueryFunc    func(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRowFunc func(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

func (m *MockDB) Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error) {
	if m.ExecFunc != nil {
		return m.ExecFunc(ctx, sql, args...)
	}
	return pgconn.NewCommandTag(""), nil
}

func (m *MockDB) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	if m.QueryFunc != nil {
		return m.QueryFunc(ctx, sql, args...)
	}
	return NewMockRows(nil), nil
}

func (m *MockDB) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	if m.QueryRowFunc != nil {
		return m.QueryRowFunc(ctx, sql, args...)
	}
	return &MockRow{}
}
