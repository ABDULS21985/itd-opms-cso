package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Println("ITD-OPMS API starting...")
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Will be wired in Step 8
	fmt.Println("Server placeholder — implement in Step 8")
	return nil
}
