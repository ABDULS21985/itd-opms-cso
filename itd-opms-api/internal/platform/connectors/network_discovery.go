package connectors

import (
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gosnmp/gosnmp"
)

var defaultNetworkDiscoveryPorts = []int{22, 80, 135, 443, 161, 3389}

// NetworkDiscoveryConnector performs a lightweight TCP port sweep and optional SNMP enrichment.
type NetworkDiscoveryConnector struct {
	timeout       time.Duration
	maxConcurrent int
}

// NewNetworkDiscoveryConnector creates a network discovery connector.
func NewNetworkDiscoveryConnector(cfg NetworkConfig) *NetworkDiscoveryConnector {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 2 * time.Second
	}

	maxConcurrent := cfg.MaxConcurrent
	if maxConcurrent <= 0 {
		maxConcurrent = 50
	}

	return &NetworkDiscoveryConnector{
		timeout:       timeout,
		maxConcurrent: maxConcurrent,
	}
}

// PingSweep performs a TCP-based sweep across the CIDR range.
func (c *NetworkDiscoveryConnector) PingSweep(ipRange string) ([]DiscoveredDevice, error) {
	if c == nil {
		return nil, fmt.Errorf("network discovery connector is not configured")
	}

	ips, err := ipv4Hosts(ipRange)
	if err != nil {
		return nil, err
	}

	type result struct {
		device *DiscoveredDevice
	}

	results := make(chan result, len(ips))
	sem := make(chan struct{}, c.maxConcurrent)
	var wg sync.WaitGroup

	for _, ip := range ips {
		wg.Add(1)
		go func(ip string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			openPorts := c.scanHost(ip)
			if len(openPorts) == 0 {
				return
			}

			sort.Slice(openPorts, func(i, j int) bool { return openPorts[i] < openPorts[j] })
			results <- result{
				device: &DiscoveredDevice{
					IPAddress:  stringPtr(ip),
					DeviceType: stringPtr(inferNetworkDeviceType(openPorts)),
					OpenPorts:  openPorts,
					Attributes: mustRawJSON(map[string]any{
						"scanType":  "network",
						"ipAddress": ip,
						"openPorts": openPorts,
					}),
					Source: "network",
				},
			}
		}(ip)
	}

	wg.Wait()
	close(results)

	devices := make([]DiscoveredDevice, 0, len(results))
	for item := range results {
		if item.device != nil {
			devices = append(devices, *item.device)
		}
	}

	sort.Slice(devices, func(i, j int) bool {
		left := ""
		if devices[i].IPAddress != nil {
			left = *devices[i].IPAddress
		}
		right := ""
		if devices[j].IPAddress != nil {
			right = *devices[j].IPAddress
		}
		return left < right
	})

	return devices, nil
}

// EnrichViaSNMP attempts to read basic identification details through SNMPv2c.
func (c *NetworkDiscoveryConnector) EnrichViaSNMP(ip string, community string) (DeviceDetails, error) {
	if strings.TrimSpace(ip) == "" {
		return DeviceDetails{}, fmt.Errorf("ip is required for snmp enrichment")
	}
	if strings.TrimSpace(community) == "" {
		community = "public"
	}

	client := &gosnmp.GoSNMP{
		Target:    ip,
		Port:      161,
		Community: community,
		Version:   gosnmp.Version2c,
		Timeout:   c.timeout,
		Retries:   1,
	}
	if err := client.Connect(); err != nil {
		return DeviceDetails{}, fmt.Errorf("connect to snmp on %s: %w", ip, err)
	}
	defer client.Conn.Close()

	packet, err := client.Get([]string{
		".1.3.6.1.2.1.1.5.0",
		".1.3.6.1.2.1.1.1.0",
		".1.3.6.1.2.1.1.2.0",
	})
	if err != nil {
		return DeviceDetails{}, fmt.Errorf("query snmp on %s: %w", ip, err)
	}

	var sysName, sysDescr, sysObjectID string
	for _, variable := range packet.Variables {
		value := snmpValueToString(variable)
		switch variable.Name {
		case ".1.3.6.1.2.1.1.5.0":
			sysName = value
		case ".1.3.6.1.2.1.1.1.0":
			sysDescr = value
		case ".1.3.6.1.2.1.1.2.0":
			sysObjectID = value
		}
	}

	return DeviceDetails{
		Hostname:    stringPtr(sysName),
		Description: stringPtr(sysDescr),
		ObjectID:    stringPtr(sysObjectID),
		Attributes: mustRawJSON(map[string]any{
			"snmp": map[string]any{
				"sysName":     sysName,
				"sysDescr":    sysDescr,
				"sysObjectID": sysObjectID,
			},
		}),
	}, nil
}

func (c *NetworkDiscoveryConnector) scanHost(ip string) []int32 {
	var openPorts []int32
	for _, port := range defaultNetworkDiscoveryPorts {
		address := net.JoinHostPort(ip, fmt.Sprintf("%d", port))
		conn, err := net.DialTimeout("tcp", address, c.timeout)
		if err != nil {
			continue
		}
		_ = conn.Close()
		openPorts = append(openPorts, int32(port))
	}
	return openPorts
}

func ipv4Hosts(ipRange string) ([]string, error) {
	ip, ipNet, err := net.ParseCIDR(strings.TrimSpace(ipRange))
	if err != nil {
		return nil, fmt.Errorf("parse cidr %q: %w", ipRange, err)
	}
	ip = ip.To4()
	if ip == nil {
		return nil, fmt.Errorf("only ipv4 ranges are supported for network discovery")
	}

	network := ip.Mask(ipNet.Mask)
	broadcast := make(net.IP, len(network))
	for i := range network {
		broadcast[i] = network[i] | ^ipNet.Mask[i]
	}

	var hosts []string
	for current := append(net.IP(nil), network...); ipNet.Contains(current); incrementIPv4(current) {
		if current.Equal(network) || current.Equal(broadcast) {
			continue
		}
		hosts = append(hosts, current.String())
	}
	return hosts, nil
}

func incrementIPv4(ip net.IP) {
	for i := len(ip) - 1; i >= 0; i-- {
		ip[i]++
		if ip[i] != 0 {
			return
		}
	}
}

func inferNetworkDeviceType(openPorts []int32) string {
	has := func(target int32) bool {
		for _, port := range openPorts {
			if port == target {
				return true
			}
		}
		return false
	}

	switch {
	case has(161):
		return "network_device"
	case has(135) && has(3389):
		return "workstation"
	case has(22) && (has(80) || has(443)):
		return "server"
	default:
		return "endpoint"
	}
}

func snmpValueToString(variable gosnmp.SnmpPDU) string {
	switch value := variable.Value.(type) {
	case string:
		return value
	case []byte:
		return string(value)
	default:
		return fmt.Sprintf("%v", value)
	}
}
