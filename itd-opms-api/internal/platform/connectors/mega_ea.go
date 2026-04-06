package connectors

import (
	"encoding/xml"
	"fmt"
	"io"
	"time"
)

// MEGAConfigurationItem represents a CI in the MEGA EA XSD-aligned XML format.
type MEGAConfigurationItem struct {
	XMLName      xml.Name            `xml:"ConfigurationItem"`
	ID           string              `xml:"id,attr"`
	Name         string              `xml:"Name"`
	Description  string              `xml:"Description,omitempty"`
	CIType       string              `xml:"CIType"`
	Status       string              `xml:"Status"`
	Environment  string              `xml:"Environment,omitempty"`
	Owner        string              `xml:"Owner,omitempty"`
	Criticality  string              `xml:"Criticality,omitempty"`
	IPAddress    string              `xml:"IPAddress,omitempty"`
	MACAddress   string              `xml:"MACAddress,omitempty"`
	Manufacturer string              `xml:"Manufacturer,omitempty"`
	Model        string              `xml:"Model,omitempty"`
	SerialNumber string              `xml:"SerialNumber,omitempty"`
	OS           *MEGAOperatingSystem `xml:"OperatingSystem,omitempty"`
	Location     string              `xml:"Location,omitempty"`
	Department   string              `xml:"Department,omitempty"`
	Attributes   []MEGAAttribute     `xml:"Attributes>Attribute,omitempty"`
	Relations    []MEGARelationship  `xml:"Relationships>Relationship,omitempty"`
	ExportedAt   string              `xml:"exportedAt,attr,omitempty"`
}

// MEGAOperatingSystem is a nested element for OS details.
type MEGAOperatingSystem struct {
	Name    string `xml:"Name,omitempty"`
	Version string `xml:"Version,omitempty"`
}

// MEGAAttribute is a generic key-value pair inside the CI.
type MEGAAttribute struct {
	Name  string `xml:"name,attr"`
	Value string `xml:",chardata"`
}

// MEGARelationship describes a directional link between CIs.
type MEGARelationship struct {
	Type     string `xml:"type,attr"`
	TargetID string `xml:"targetId,attr"`
	Name     string `xml:",chardata"`
}

// MEGACIExport is the root element for MEGA EA XML exchange.
type MEGACIExport struct {
	XMLName    xml.Name                `xml:"CIExport"`
	Version    string                  `xml:"version,attr"`
	Source     string                  `xml:"source,attr"`
	ExportedAt string                  `xml:"exportedAt,attr"`
	Items      []MEGAConfigurationItem `xml:"ConfigurationItem"`
}

// ExportCIsToMEGA serialises a slice of CIs to MEGA EA-compatible XML.
func ExportCIsToMEGA(items []MEGAConfigurationItem) ([]byte, error) {
	export := MEGACIExport{
		Version:    "1.0",
		Source:     "ITD-OPMS",
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Items:      items,
	}

	data, err := xml.MarshalIndent(export, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal MEGA XML: %w", err)
	}
	return append([]byte(xml.Header), data...), nil
}

// ImportFromMEGA decodes MEGA EA XML from a reader and returns the CI list.
func ImportFromMEGA(reader io.Reader) ([]MEGAConfigurationItem, error) {
	var export MEGACIExport
	if err := xml.NewDecoder(reader).Decode(&export); err != nil {
		return nil, fmt.Errorf("decode MEGA XML: %w", err)
	}
	return export.Items, nil
}
