#!/usr/bin/env node
/**
 * Seed script for Knowledge Base — ITD-OPMS
 * Creates categories, articles (all 5 types), and publishes them.
 *
 * Usage: node scripts/seed-knowledge.mjs
 */

const API = "http://127.0.0.1:8089/api/v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Auth ────────────────────────────────────────────────────────────
async function login() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@itd.cbn.gov.ng", password: "admin123" }),
    });
    if (res.status === 429) { await sleep(attempt * 2000); continue; }
    const json = await res.json();
    if (json.status !== "success") throw new Error("Login failed: " + JSON.stringify(json));
    return json.data.accessToken;
  }
  throw new Error("Login failed after 5 attempts");
}

// ── API helpers ─────────────────────────────────────────────────────
async function apiPost(token, path, body, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.status === 429) { await sleep(attempt * 2000); continue; }
    const json = await res.json();
    if (res.status >= 400) return { ok: false, status: res.status, json };
    const data = json.data !== undefined ? json.data : json;
    // unwrap double-wrap
    if (data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 1 && data.data) {
      return { ok: true, data: data.data };
    }
    return { ok: true, data };
  }
  return { ok: false, status: 429, json: { message: "Rate limited after retries" } };
}

// ── Categories ──────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "IT Operations", description: "Guides for day-to-day IT operations, monitoring, and infrastructure management", icon: "server" },
  { name: "Cybersecurity", description: "Security policies, incident response, threat mitigation, and awareness", icon: "shield" },
  { name: "Network Engineering", description: "Network architecture, configuration, troubleshooting, and optimization", icon: "network" },
  { name: "Software Development", description: "Development practices, CI/CD pipelines, code review, and DevOps", icon: "code" },
  { name: "Cloud & Virtualization", description: "Cloud platforms, containerization, and virtual infrastructure", icon: "cloud" },
  { name: "Database Administration", description: "Database management, optimization, backup, and recovery procedures", icon: "database" },
  { name: "Help Desk & Support", description: "End-user support procedures, common fixes, and escalation paths", icon: "headphones" },
  { name: "Business Continuity", description: "Disaster recovery, backup strategies, and continuity planning", icon: "life-buoy" },
  { name: "Compliance & Governance", description: "Regulatory compliance, audit procedures, and policy management", icon: "file-check" },
  { name: "Project Management", description: "Project planning, agile practices, and delivery management", icon: "gantt-chart" },
];

// ── Articles ────────────────────────────────────────────────────────
function articles(catMap) {
  return [
    // ═══ IT Operations ═══
    { categoryId: catMap["IT Operations"], title: "Server Health Monitoring Setup Guide", slug: "server-health-monitoring-setup", type: "how_to", tags: ["monitoring","prometheus","grafana","infrastructure"], content: `# Server Health Monitoring Setup Guide

## Overview
This guide walks through setting up comprehensive server health monitoring using Prometheus and Grafana for the ITD infrastructure.

## Prerequisites
- Linux server with Docker installed
- Network access to target servers
- Admin credentials for Grafana

## Step 1: Install Prometheus
\`\`\`bash
docker run -d --name prometheus -p 9090:9090 -v /etc/prometheus:/etc/prometheus prom/prometheus
\`\`\`

## Step 2: Configure Scrape Targets
Edit \`/etc/prometheus/prometheus.yml\`:
\`\`\`yaml
scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['server1:9100', 'server2:9100']
  - job_name: 'application'
    static_configs:
      - targets: ['app1:8089', 'app2:8089']
\`\`\`

## Step 3: Install Grafana
\`\`\`bash
docker run -d --name grafana -p 3000:3000 grafana/grafana
\`\`\`

## Step 4: Create Dashboards
1. Add Prometheus as a data source in Grafana
2. Import the Node Exporter dashboard (ID: 1860)
3. Create custom panels for application-specific metrics

## Key Metrics to Monitor
- **CPU Usage**: \`100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)\`
- **Memory Usage**: \`(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100\`
- **Disk I/O**: \`rate(node_disk_io_time_seconds_total[5m])\`
- **Network Traffic**: \`rate(node_network_receive_bytes_total[5m])\`

## Alerting Rules
Configure alerts for:
- CPU usage > 85% for 5 minutes
- Memory usage > 90% for 5 minutes
- Disk usage > 85%
- Service down for > 2 minutes` },

    { categoryId: catMap["IT Operations"], title: "Linux Service Management with systemd", slug: "linux-systemd-service-management", type: "how_to", tags: ["linux","systemd","services","administration"], content: `# Linux Service Management with systemd

## Overview
Guide to managing services on RHEL/Ubuntu servers using systemd, the default init system for modern Linux distributions.

## Basic Commands

### Check service status
\`\`\`bash
systemctl status nginx
systemctl is-active nginx
systemctl is-enabled nginx
\`\`\`

### Start, stop, restart
\`\`\`bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx   # Reload config without downtime
\`\`\`

### Enable/disable on boot
\`\`\`bash
sudo systemctl enable nginx
sudo systemctl disable nginx
\`\`\`

## Creating a Custom Service Unit
Create \`/etc/systemd/system/opms-api.service\`:
\`\`\`ini
[Unit]
Description=ITD OPMS API Server
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=opms
Group=opms
WorkingDirectory=/opt/opms-api
ExecStart=/opt/opms-api/bin/api
Restart=always
RestartSec=5
Environment=SERVER_ENV=production

[Install]
WantedBy=multi-user.target
\`\`\`

## Viewing Logs
\`\`\`bash
journalctl -u opms-api -f          # Follow live logs
journalctl -u opms-api --since today
journalctl -u opms-api -p err      # Only errors
\`\`\`

## Troubleshooting
- If a service fails to start, check \`journalctl -xe\` for detailed errors
- Verify file permissions match the User/Group in the unit file
- Run \`systemd-analyze blame\` to identify slow-starting services` },

    { categoryId: catMap["IT Operations"], title: "Automated Log Rotation and Retention Policy", slug: "log-rotation-retention-policy", type: "best_practice", tags: ["logging","logrotate","retention","compliance"], content: `# Automated Log Rotation and Retention Policy

## Policy Statement
All production systems must implement automated log rotation to prevent disk exhaustion while maintaining logs for the compliance-required retention period.

## Retention Requirements
| Log Type | Retention Period | Justification |
|----------|-----------------|---------------|
| Application logs | 90 days | Operational troubleshooting |
| Security/audit logs | 365 days | CBN regulatory requirement |
| Access logs | 180 days | Security investigation |
| Database logs | 90 days | Performance analysis |
| Backup logs | 365 days | Disaster recovery audit |

## logrotate Configuration
Create \`/etc/logrotate.d/opms\`:
\`\`\`
/var/log/opms/*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 0640 opms opms
    sharedscripts
    postrotate
        systemctl reload opms-api 2>/dev/null || true
    endscript
}
\`\`\`

## Centralized Logging
Forward logs to the central ELK stack:
1. Install Filebeat on each server
2. Configure output to Logstash
3. Create index lifecycle policies in Elasticsearch matching retention requirements

## Monitoring
- Alert when disk usage exceeds 80%
- Monitor log ingestion rate for anomalies
- Verify rotation is occurring via weekly cron check` },

    { categoryId: catMap["IT Operations"], title: "Server Not Responding to Ping", slug: "server-not-responding-ping", type: "troubleshooting", tags: ["networking","ping","connectivity","troubleshooting"], content: `# Troubleshooting: Server Not Responding to Ping

## Symptom
A server that was previously reachable is no longer responding to ICMP ping requests.

## Diagnostic Steps

### Step 1: Verify from multiple sources
\`\`\`bash
ping -c 4 <server-ip>
traceroute <server-ip>
\`\`\`
Try pinging from a different network segment to rule out local network issues.

### Step 2: Check if only ICMP is blocked
\`\`\`bash
nc -zv <server-ip> 22    # Test SSH
nc -zv <server-ip> 80    # Test HTTP
nmap -Pn <server-ip>     # Port scan without ping
\`\`\`

### Step 3: Check firewall rules (if you have console access)
\`\`\`bash
sudo iptables -L -n | grep icmp
sudo firewall-cmd --list-all
\`\`\`

### Step 4: Check if the server is actually down
- Access via out-of-band management (iLO, iDRAC, IPMI)
- Check hypervisor console if VM
- Contact data center if physical

## Common Causes
| Cause | Resolution |
|-------|-----------|
| Firewall blocking ICMP | Add rule: \`iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT\` |
| Network interface down | \`ip link set eth0 up\` |
| Routing issue | Check \`ip route\` and default gateway |
| Server crashed/hung | Reboot via management console |
| ARP table stale | Clear ARP cache: \`ip neigh flush all\` |

## Escalation
If the server is physically unresponsive after 15 minutes of troubleshooting, escalate to Infrastructure team lead.` },

    { categoryId: catMap["IT Operations"], title: "What is the change management process?", slug: "change-management-process-faq", type: "faq", tags: ["change-management","itil","process"], content: `# FAQ: What is the Change Management Process?

## Q: What is change management?
**A:** Change management is the ITIL process for controlling modifications to IT infrastructure and services. All changes must be reviewed, approved, and documented to minimize risk and service disruption.

## Q: What types of changes exist?
**A:**
- **Standard Change**: Pre-approved, low-risk, routine (e.g., password resets, adding users)
- **Normal Change**: Requires CAB review and approval (e.g., software upgrades, config changes)
- **Emergency Change**: Bypasses normal approval for critical fixes (requires post-implementation review)

## Q: How do I submit a change request?
**A:** Submit via the OPMS portal under ITSM > Change Requests. Include:
1. Description of the change
2. Business justification
3. Risk assessment
4. Rollback plan
5. Implementation schedule

## Q: What is the CAB?
**A:** The Change Advisory Board (CAB) meets weekly to review normal changes. Members include IT managers, security team, and affected stakeholders.

## Q: What is the change freeze period?
**A:** No non-emergency changes are allowed during:
- Month-end processing (last 3 business days)
- Year-end (December 15 – January 5)
- During regulatory examinations

## Q: What happens if a change fails?
**A:** Execute the rollback plan immediately. Document the failure, conduct a post-implementation review, and submit a new change request with lessons learned.` },

    { categoryId: catMap["IT Operations"], title: "Runbook: Monthly Patch Management Cycle", slug: "monthly-patch-management-runbook", type: "runbook", tags: ["patching","maintenance","security","runbook"], content: `# Runbook: Monthly Patch Management Cycle

## Schedule
- **Patch Tuesday + 7 days**: Test patches in staging
- **Patch Tuesday + 14 days**: Deploy to production (non-critical)
- **Patch Tuesday + 21 days**: Deploy to production (critical systems)

## Pre-Patch Checklist
- [ ] Review Microsoft/vendor patch bulletins
- [ ] Identify affected systems from CMDB
- [ ] Take VM snapshots of all target servers
- [ ] Verify backup completion for all targets
- [ ] Notify stakeholders of maintenance window
- [ ] Prepare rollback procedures

## Execution Steps

### 1. Staging Environment (Day 7-14)
\`\`\`bash
# RHEL/CentOS
sudo yum update --security -y
# Ubuntu
sudo apt update && sudo apt upgrade -y
\`\`\`
- Run application smoke tests
- Monitor for 48 hours

### 2. Production Non-Critical (Day 14-17)
- Apply patches during maintenance window (Saturday 02:00-06:00)
- Patch in rolling fashion: 25% of servers at a time
- Verify service health between batches

### 3. Production Critical (Day 17-21)
- Requires CAB approval
- Dedicated maintenance window with full team on standby
- Apply to DR first, verify, then primary

## Post-Patch Verification
- [ ] All services responding (health check endpoints)
- [ ] No new errors in application logs
- [ ] Performance metrics within normal range
- [ ] Security scan shows patches applied
- [ ] Update CMDB with patch status

## Rollback Procedure
1. Revert VM snapshots
2. Verify service restoration
3. Document failed patches
4. Schedule re-attempt with vendor support` },

    // ═══ Cybersecurity ═══
    { categoryId: catMap["Cybersecurity"], title: "Phishing Email Identification Guide", slug: "phishing-email-identification", type: "how_to", tags: ["phishing","email","security-awareness","social-engineering"], content: `# Phishing Email Identification Guide

## Overview
Phishing remains the #1 attack vector. This guide helps staff identify and report suspicious emails.

## Red Flags to Watch For

### 1. Sender Address
- Domain misspellings: \`admin@cbn-gov.ng\` instead of \`admin@cbn.gov.ng\`
- Free email providers for business communication
- Display name doesn't match email address

### 2. Content Warning Signs
- **Urgency**: "Your account will be suspended in 24 hours"
- **Fear**: "Unauthorized access detected on your account"
- **Too good to be true**: "You've won a prize"
- **Generic greeting**: "Dear Customer" instead of your name
- **Grammar/spelling errors**: Professional organizations proofread communications

### 3. Links and Attachments
- Hover over links before clicking — does the URL match the claimed destination?
- Unexpected attachments, especially .exe, .zip, .js, .scr files
- Shortened URLs (bit.ly, tinyurl) in business emails

### 4. Request Type
- Requests for passwords or credentials
- Wire transfer or payment modifications
- Requests to bypass normal procedures

## What To Do
1. **DO NOT** click any links or download attachments
2. **DO NOT** reply to the email
3. Forward the email to security@cbn.gov.ng
4. Report via the "Report Phishing" button in Outlook
5. Delete the email from your inbox

## If You Clicked a Link
1. Disconnect from the network immediately
2. Call the IT Help Desk: ext. 4357
3. Change your password from a different device
4. Document what you clicked and any information entered` },

    { categoryId: catMap["Cybersecurity"], title: "Incident Response Procedure", slug: "incident-response-procedure", type: "runbook", tags: ["incident-response","security","breach","runbook"], content: `# Incident Response Procedure

## Severity Levels
| Level | Description | Response Time | Example |
|-------|------------|---------------|---------|
| P1 - Critical | Active breach, data exfiltration | 15 minutes | Ransomware, unauthorized access to production |
| P2 - High | Confirmed compromise, contained | 1 hour | Malware detected, phishing success |
| P3 - Medium | Suspicious activity, no confirmed impact | 4 hours | Unusual login patterns, policy violations |
| P4 - Low | Informational, false positive | 24 hours | Scanner alerts, config drift |

## Phase 1: Detection & Triage (0-30 min)
1. Confirm the alert is not a false positive
2. Classify severity level
3. Assign incident commander
4. Create incident ticket in OPMS ITSM module
5. Notify: CISO (P1/P2), IT Director (P1), all security team (P1)

## Phase 2: Containment (30-120 min)
### Short-term
- Isolate affected systems from network
- Block malicious IPs/domains at firewall
- Disable compromised accounts
- Preserve forensic evidence (memory dumps, disk images)

### Long-term
- Apply temporary firewall rules
- Implement additional monitoring
- Stand up clean replacement systems if needed

## Phase 3: Eradication (Day 1-3)
- Remove malware/backdoors
- Patch exploited vulnerabilities
- Reset all potentially compromised credentials
- Scan all systems for indicators of compromise (IOCs)

## Phase 4: Recovery (Day 3-7)
- Restore systems from clean backups
- Gradually reconnect to network
- Monitor intensively for 72 hours
- Verify no persistence mechanisms remain

## Phase 5: Lessons Learned (Day 7-14)
- Conduct post-incident review
- Document timeline and decisions
- Update detection rules
- Brief leadership and affected stakeholders
- File regulatory reports if required (CBN, NDPR)` },

    { categoryId: catMap["Cybersecurity"], title: "Password Policy and Best Practices", slug: "password-policy-best-practices", type: "best_practice", tags: ["passwords","authentication","security","policy"], content: `# Password Policy and Best Practices

## Policy Requirements (Mandatory)
| Requirement | Standard |
|-------------|----------|
| Minimum length | 14 characters |
| Complexity | At least 3 of: uppercase, lowercase, numbers, symbols |
| Maximum age | 90 days |
| History | Cannot reuse last 12 passwords |
| Lockout | 5 failed attempts = 30-minute lockout |
| MFA | Required for all accounts |

## Best Practices

### Use Passphrases
Instead of \`P@ssw0rd123!\`, use something like:
- \`correct-horse-battery-staple-2024\`
- \`MyDogLoves2RunInThePark!\`

### Multi-Factor Authentication (MFA)
- Use Microsoft Authenticator app (preferred)
- Hardware tokens available for privileged accounts
- SMS-based MFA is acceptable but not preferred

### Password Managers
- IT-approved: Bitwarden (enterprise license available)
- Store unique passwords for every service
- Never share master password

### What NOT To Do
- Never share passwords via email, chat, or phone
- Never write passwords on sticky notes
- Never use the same password across multiple services
- Never include personal information (birthdate, name, employee ID)
- Never store passwords in plaintext files or spreadsheets

## Service Account Passwords
- Minimum 24 characters, randomly generated
- Rotate every 60 days
- Store in HashiCorp Vault
- Review access quarterly` },

    { categoryId: catMap["Cybersecurity"], title: "Why was my account locked?", slug: "account-locked-faq", type: "faq", tags: ["account","lockout","authentication","faq"], content: `# FAQ: Why Was My Account Locked?

## Q: Why is my account locked?
**A:** Accounts are locked after 5 consecutive failed login attempts within 15 minutes. This protects against brute-force attacks.

## Q: How long does the lockout last?
**A:** Standard lockout is 30 minutes. After that, you can try again. If you're locked out repeatedly, contact the Help Desk.

## Q: Can I unlock it myself?
**A:** Yes, you can:
1. Wait 30 minutes for auto-unlock
2. Use the self-service password reset at https://passwordreset.microsoftonline.com
3. Call Help Desk at ext. 4357

## Q: What if I didn't make those attempts?
**A:** This is a security concern. Someone may be trying to access your account.
1. Report it to security@cbn.gov.ng immediately
2. Change your password once unlocked
3. Review your recent login history in the security portal
4. Enable MFA if not already active

## Q: Does VPN count toward lockout?
**A:** Yes. Failed VPN authentication counts toward the lockout threshold. Ensure your saved VPN credentials are current.

## Q: Why does my account lock every morning?
**A:** Common causes:
- Cached/saved password in Outlook, mobile email, or VPN is outdated
- A shared device still using your old credentials
- Solution: Update password on ALL devices after a password change` },

    { categoryId: catMap["Cybersecurity"], title: "Troubleshooting VPN Connection Failures", slug: "vpn-connection-troubleshooting", type: "troubleshooting", tags: ["vpn","remote-access","connectivity","troubleshooting"], content: `# Troubleshooting VPN Connection Failures

## Symptom
Unable to establish VPN connection to the corporate network.

## Quick Checks
1. Is your internet connection working? (Try browsing google.com)
2. Is the VPN client updated to the latest version?
3. Are you using the correct VPN profile?

## Error-Specific Solutions

### "Authentication Failed"
- Verify username format: \`domain\\username\` or \`username@cbn.gov.ng\`
- Check if your password recently changed
- Ensure MFA token is current (not expired)
- Check if your account is locked (see Account Lockout FAQ)

### "Connection Timed Out"
- Try a different network (mobile hotspot as test)
- Check if port 443 or 4433 is blocked by local firewall
- Disable local firewall temporarily to test
- Try the backup VPN gateway: vpn2.cbn.gov.ng

### "Certificate Error"
- Update the VPN client to the latest version
- Clear VPN client cache/profile and re-import
- Check system date/time is correct (certificates are time-sensitive)
- Import the latest root CA certificate from IT portal

### "Connected but No Access"
- Run \`ipconfig /all\` and verify you received a VPN IP (10.x.x.x)
- Try \`nslookup intranet.cbn.gov.ng\` to test DNS resolution
- Check split-tunneling settings
- Flush DNS: \`ipconfig /flushdns\`

## Escalation
If none of the above resolves the issue:
1. Collect VPN client logs (Help > Export Logs)
2. Note your public IP address (whatismyip.com)
3. Submit a ticket to the Network Engineering team with logs attached` },

    // ═══ Network Engineering ═══
    { categoryId: catMap["Network Engineering"], title: "VLAN Configuration Standard", slug: "vlan-configuration-standard", type: "best_practice", tags: ["vlan","networking","standards","segmentation"], content: `# VLAN Configuration Standard

## VLAN Assignment Table
| VLAN ID | Name | Subnet | Purpose |
|---------|------|--------|---------|
| 10 | MGMT | 10.0.10.0/24 | Network device management |
| 20 | SERVERS | 10.0.20.0/23 | Production servers |
| 30 | DMZ | 10.0.30.0/24 | Public-facing services |
| 40 | USERS | 10.0.40.0/22 | End-user workstations |
| 50 | VOIP | 10.0.50.0/24 | Voice over IP phones |
| 60 | PRINTERS | 10.0.60.0/24 | Network printers |
| 70 | GUEST | 10.0.70.0/24 | Guest WiFi (isolated) |
| 80 | IOT | 10.0.80.0/24 | IoT devices (isolated) |
| 100 | DEV | 10.0.100.0/24 | Development environment |
| 200 | DR | 10.0.200.0/23 | Disaster recovery |

## Configuration Standards
- All inter-VLAN routing through core switch or firewall
- Guest VLAN must be completely isolated from corporate VLANs
- DHCP snooping enabled on all access ports
- Dynamic ARP inspection enabled
- 802.1X authentication on user-facing ports

## Trunk Port Configuration (Cisco Example)
\`\`\`
interface GigabitEthernet0/1
  switchport mode trunk
  switchport trunk allowed vlan 10,20,30,40,50
  switchport trunk native vlan 999
  spanning-tree portfast trunk
\`\`\`

## Access Port Configuration
\`\`\`
interface GigabitEthernet0/2
  switchport mode access
  switchport access vlan 40
  spanning-tree portfast
  spanning-tree bpduguard enable
\`\`\`` },

    { categoryId: catMap["Network Engineering"], title: "Troubleshooting Slow Network Performance", slug: "slow-network-performance-troubleshooting", type: "troubleshooting", tags: ["performance","bandwidth","latency","troubleshooting"], content: `# Troubleshooting Slow Network Performance

## Symptom
Users report slow application response times or file transfer speeds.

## Diagnostic Steps

### Step 1: Identify Scope
- Is it one user or many? (Individual vs. network-wide)
- Is it one application or all traffic? (Application vs. network)
- When did it start? (Correlate with changes)

### Step 2: Basic Connectivity Tests
\`\`\`bash
# Latency check
ping -c 20 gateway-ip
ping -c 20 application-server

# Bandwidth test
iperf3 -c test-server -t 30

# DNS resolution speed
time nslookup app.cbn.gov.ng

# Traceroute to find bottleneck
traceroute -n application-server
\`\`\`

### Step 3: Switch/Router Analysis
\`\`\`
show interface status           # Check for errors/drops
show interface counters errors  # CRC, runts, giants
show mac address-table          # Check for MAC flapping
show spanning-tree              # STP topology changes
show processes cpu              # Switch CPU overload
\`\`\`

### Step 4: Check for Common Causes
| Cause | Indicator | Fix |
|-------|-----------|-----|
| Duplex mismatch | CRC errors, late collisions | Set both ends to auto or same speed/duplex |
| Broadcast storm | High broadcast counter, CPU spike | Check for loops, enable storm control |
| MTU mismatch | Fragmentation, packet drops | Standardize MTU across path |
| QoS misconfiguration | Specific traffic types slow | Review QoS policies |
| Bandwidth saturation | >80% utilization | Upgrade link or implement QoS |
| DNS issues | High DNS resolution time | Check DNS server health |

### Step 5: Packet Capture (if needed)
\`\`\`bash
tcpdump -i eth0 -w /tmp/capture.pcap host <problem-ip> -c 10000
\`\`\`
Analyze in Wireshark for retransmissions, resets, or protocol errors.` },

    { categoryId: catMap["Network Engineering"], title: "Firewall Rule Request Process", slug: "firewall-rule-request-process", type: "faq", tags: ["firewall","rules","process","security"], content: `# FAQ: Firewall Rule Request Process

## Q: How do I request a new firewall rule?
**A:** Submit a change request in OPMS with:
1. Source IP/subnet
2. Destination IP/subnet
3. Port(s) and protocol (TCP/UDP)
4. Business justification
5. Duration (permanent or temporary with end date)

## Q: How long does approval take?
**A:** Standard rules: 3-5 business days via normal change process. Emergency rules: 2-4 hours with emergency CAB approval.

## Q: Who approves firewall rules?
**A:** Requires dual approval:
1. Network Engineering team lead
2. Cybersecurity team (security review)

## Q: Can I request "any" as source or destination?
**A:** No. All rules must follow the principle of least privilege. Specify exact IPs/subnets and ports. "Any" rules are only permitted for outbound web access (80/443) from user VLANs.

## Q: How do I check if a rule already exists?
**A:** Contact Network Engineering with the 5-tuple (source IP, dest IP, source port, dest port, protocol). They will check the firewall policy.

## Q: How long are temporary rules kept?
**A:** Temporary rules are automatically reviewed monthly. Rules past their expiry are disabled after 7 days' notice and removed after 30 days.

## Q: What about rules for cloud services?
**A:** Cloud-bound traffic goes through the web proxy. For direct access (e.g., Azure ExpressRoute), submit a separate cloud connectivity request.` },

    // ═══ Software Development ═══
    { categoryId: catMap["Software Development"], title: "Git Branching Strategy and Workflow", slug: "git-branching-strategy", type: "best_practice", tags: ["git","branching","workflow","version-control"], content: `# Git Branching Strategy and Workflow

## Branch Naming Convention
| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Main | \`main\` | Production-ready code |
| Development | \`develop\` | Integration branch |
| Feature | \`feature/<ticket-id>-<description>\` | \`feature/OPMS-123-add-dashboard\` |
| Bugfix | \`fix/<ticket-id>-<description>\` | \`fix/OPMS-456-login-error\` |
| Hotfix | \`hotfix/<ticket-id>-<description>\` | \`hotfix/OPMS-789-critical-bug\` |
| Release | \`release/<version>\` | \`release/2.1.0\` |

## Workflow

### Feature Development
1. Create branch from \`develop\`: \`git checkout -b feature/OPMS-123-add-widget develop\`
2. Make commits with conventional format: \`feat(widget): add dashboard widget component\`
3. Push and create Pull Request to \`develop\`
4. Require at least 1 code review approval
5. Squash merge to \`develop\`

### Release Process
1. Create release branch: \`git checkout -b release/2.1.0 develop\`
2. Only bugfixes allowed on release branch
3. When ready: merge to \`main\` AND back to \`develop\`
4. Tag: \`git tag -a v2.1.0 -m "Release 2.1.0"\`

### Hotfix Process
1. Branch from \`main\`: \`git checkout -b hotfix/OPMS-789-fix main\`
2. Fix, test, and create PR to \`main\`
3. After merge, cherry-pick to \`develop\`

## Commit Message Convention
\`\`\`
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
\`\`\`

## Code Review Checklist
- [ ] Code compiles and tests pass
- [ ] No security vulnerabilities introduced
- [ ] Error handling is appropriate
- [ ] No hardcoded secrets or credentials
- [ ] Database migrations are reversible` },

    { categoryId: catMap["Software Development"], title: "CI/CD Pipeline Setup with GitHub Actions", slug: "cicd-pipeline-github-actions", type: "how_to", tags: ["ci-cd","github-actions","automation","deployment"], content: `# CI/CD Pipeline Setup with GitHub Actions

## Overview
This guide covers setting up automated build, test, and deployment pipelines for ITD projects using GitHub Actions.

## Basic Pipeline Configuration
Create \`.github/workflows/ci.yml\`:

\`\`\`yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: test_pass
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: go test ./... -race -coverprofile=coverage.out
      - run: go vet ./...

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: golangci/golangci-lint-action@v4

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: go install golang.org/x/vuln/cmd/govulncheck@latest
      - run: govulncheck ./...

  deploy-staging:
    needs: [test, lint, security]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t opms-api:staging .
      - run: docker push registry.cbn.gov.ng/opms-api:staging

  deploy-production:
    needs: [test, lint, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t opms-api:latest .
      - run: docker push registry.cbn.gov.ng/opms-api:latest
\`\`\`

## Required Secrets
Configure in GitHub repository settings:
- \`REGISTRY_USERNAME\` / \`REGISTRY_PASSWORD\`
- \`DEPLOY_SSH_KEY\`
- \`SLACK_WEBHOOK_URL\` (for notifications)

## Branch Protection Rules
- Require status checks to pass before merging
- Require at least 1 review approval
- Dismiss stale reviews when new commits are pushed` },

    { categoryId: catMap["Software Development"], title: "Code Review Best Practices", slug: "code-review-best-practices", type: "best_practice", tags: ["code-review","quality","collaboration","development"], content: `# Code Review Best Practices

## For Authors

### Before Requesting Review
- Self-review your own changes first
- Ensure CI pipeline passes (tests, lint, security scan)
- Keep PRs small: aim for < 400 lines changed
- Write a clear PR description explaining the "why"
- Link to the relevant ticket/issue

### PR Description Template
\`\`\`markdown
## Summary
Brief description of changes and motivation.

## Changes
- Bullet point list of key changes

## Testing
- How was this tested?
- Any edge cases considered?

## Screenshots (if UI changes)
Before/After screenshots
\`\`\`

## For Reviewers

### What to Look For
1. **Correctness**: Does the code do what it's supposed to?
2. **Security**: Any injection risks, auth bypasses, or data leaks?
3. **Performance**: N+1 queries, unnecessary allocations, missing indexes?
4. **Readability**: Can you understand the code in 6 months?
5. **Error handling**: Are errors properly caught and reported?
6. **Edge cases**: What happens with nil, empty, or extreme inputs?

### Tone and Communication
- Ask questions rather than make demands: "What do you think about...?" vs "Change this to..."
- Explain the "why" behind suggestions
- Distinguish between blocking issues and nice-to-haves (prefix with "nit:" for minor suggestions)
- Acknowledge good solutions: "Nice approach here!"

### Response Time
- Aim to complete reviews within 4 business hours
- If you need more time, acknowledge the PR with an estimated review time` },

    { categoryId: catMap["Software Development"], title: "Build fails with 'module not found' error", slug: "build-module-not-found-troubleshooting", type: "troubleshooting", tags: ["build","go-modules","dependencies","troubleshooting"], content: `# Troubleshooting: Build Fails with 'Module Not Found'

## Symptom
Go build fails with errors like:
\`\`\`
go: module example.com/pkg@v1.2.3: reading https://proxy.golang.org/...: 410 Gone
\`\`\`
or
\`\`\`
cannot find module providing package github.com/some/pkg
\`\`\`

## Solutions

### 1. Update Module Cache
\`\`\`bash
go clean -modcache
go mod download
\`\`\`

### 2. Tidy Dependencies
\`\`\`bash
go mod tidy
\`\`\`

### 3. Private Module Access
For internal/private modules, configure GOPRIVATE:
\`\`\`bash
go env -w GOPRIVATE=github.com/cbn-itd/*
git config --global url."git@github.com:".insteadOf "https://github.com/"
\`\`\`

### 4. Vendor Directory
If using vendored dependencies:
\`\`\`bash
go mod vendor
go build -mod=vendor ./...
\`\`\`

### 5. Proxy Issues
If behind corporate proxy:
\`\`\`bash
go env -w GOPROXY=https://proxy.golang.org,direct
go env -w GONOSUMCHECK=github.com/cbn-itd/*
\`\`\`

### 6. Version Conflicts
Check for incompatible versions:
\`\`\`bash
go mod graph | grep <problematic-module>
go mod why <module-path>
\`\`\`

## Prevention
- Always run \`go mod tidy\` before committing
- Pin dependencies to specific versions, not branches
- Use \`go.sum\` to verify integrity (never delete it)
- Run \`go mod verify\` in CI pipeline` },

    // ═══ Cloud & Virtualization ═══
    { categoryId: catMap["Cloud & Virtualization"], title: "Docker Container Best Practices", slug: "docker-container-best-practices", type: "best_practice", tags: ["docker","containers","security","best-practices"], content: `# Docker Container Best Practices

## Image Building

### Use Multi-Stage Builds
\`\`\`dockerfile
# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api

# Runtime stage
FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /api /api
USER 1001
EXPOSE 8089
ENTRYPOINT ["/api"]
\`\`\`

### Image Security
- Use specific version tags, not \`latest\`
- Scan images with Trivy: \`trivy image opms-api:latest\`
- Never run containers as root (use USER directive)
- Don't store secrets in images (use environment variables or secrets manager)
- Use .dockerignore to exclude sensitive files

### Image Optimization
- Order Dockerfile commands from least to most frequently changing
- Combine RUN commands to reduce layers
- Use Alpine-based images where possible
- Remove unnecessary packages and build tools in final stage

## Container Runtime

### Resource Limits
\`\`\`yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
\`\`\`

### Health Checks
\`\`\`dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8089/health || exit 1
\`\`\`

### Logging
- Use \`json-file\` driver with max size limits
- Forward logs to centralized logging (ELK/Loki)
- Never log sensitive data (passwords, tokens, PII)` },

    { categoryId: catMap["Cloud & Virtualization"], title: "VM Snapshot and Backup Procedures", slug: "vm-snapshot-backup-procedures", type: "runbook", tags: ["vmware","backup","snapshots","disaster-recovery"], content: `# Runbook: VM Snapshot and Backup Procedures

## When to Take Snapshots
- Before applying OS patches
- Before application upgrades
- Before configuration changes
- Before database schema migrations

## Snapshot Procedure (VMware vSphere)

### Pre-Snapshot Checks
- [ ] Verify sufficient datastore space (snapshot needs ~20% of VM disk)
- [ ] Notify application team of pending snapshot
- [ ] Quiesce application if possible (stop writes)

### Taking a Snapshot
1. Open vSphere Client
2. Right-click VM → Snapshots → Take Snapshot
3. Name format: \`YYYY-MM-DD_reason\` (e.g., \`2026-03-28_pre-patch\`)
4. Check "Snapshot the virtual machine's memory" for running VMs
5. Check "Quiesce guest file system" for consistent disk state

### Reverting a Snapshot
1. Verify this is the correct action (data since snapshot will be lost)
2. Get approval from application owner
3. Right-click VM → Snapshots → Revert to Latest
4. Verify application functionality after revert

### Deleting Snapshots
**IMPORTANT**: Snapshots must be deleted within 72 hours. Long-lived snapshots cause:
- Performance degradation
- Datastore space exhaustion
- Backup failures

## Backup Schedule
| System Type | Full Backup | Incremental | Retention |
|-------------|-------------|-------------|-----------|
| Production DB | Weekly (Sun) | Daily | 30 days |
| Application Servers | Weekly (Sat) | Daily | 14 days |
| File Servers | Weekly (Sun) | Daily | 60 days |
| Domain Controllers | Weekly (Sat) | Daily | 30 days |

## Backup Verification
- Monthly restore test of random production system
- Quarterly DR drill with full environment restoration
- Document results in DR test report` },

    { categoryId: catMap["Cloud & Virtualization"], title: "What cloud services are approved for use?", slug: "approved-cloud-services-faq", type: "faq", tags: ["cloud","azure","policy","governance"], content: `# FAQ: What Cloud Services Are Approved for Use?

## Q: What cloud platform do we use?
**A:** Microsoft Azure is the primary approved cloud platform. We have an Enterprise Agreement with dedicated subscriptions for production, staging, and development.

## Q: Can I use AWS or Google Cloud?
**A:** No. All cloud workloads must be on Azure unless a specific exception is granted by the CTO. This ensures consistent security controls, cost management, and compliance.

## Q: What Azure services are approved?
**A:** Pre-approved services (no additional approval needed):
- Azure App Service, Azure Functions
- Azure SQL Database, Cosmos DB
- Azure Blob Storage, Azure Files
- Azure Key Vault
- Azure Monitor, Application Insights
- Azure DevOps
- Azure Active Directory (Entra ID)

Services requiring Cloud Architecture Review Board approval:
- Azure Kubernetes Service (AKS)
- Azure Virtual Machines (IaaS)
- Azure Virtual Network peering
- Any service handling PII or financial data

## Q: Can I spin up resources for testing?
**A:** Yes, in the Development subscription only. All test resources must:
- Be tagged with your team and ticket number
- Use the smallest tier available
- Be deleted when testing is complete
- Not contain production data

## Q: How do I request a new cloud resource?
**A:** Submit a Cloud Resource Request through OPMS under Infrastructure > Cloud Requests. Include architecture diagram, cost estimate, and security assessment.` },

    // ═══ Database Administration ═══
    { categoryId: catMap["Database Administration"], title: "PostgreSQL Query Optimization Guide", slug: "postgresql-query-optimization", type: "how_to", tags: ["postgresql","performance","optimization","indexing"], content: `# PostgreSQL Query Optimization Guide

## Step 1: Identify Slow Queries
Enable slow query logging:
\`\`\`sql
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();
\`\`\`

Or use pg_stat_statements:
\`\`\`sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
\`\`\`

## Step 2: Analyze Query Plans
\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM tickets
WHERE tenant_id = '...' AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;
\`\`\`

### Reading the Plan
- **Seq Scan**: Table scan — needs an index if table is large
- **Index Scan**: Good — using an index efficiently
- **Bitmap Heap Scan**: OK — using index for filtering then fetching rows
- **Nested Loop**: Watch for high row counts on inner loop
- **Hash Join**: Good for joining large datasets

## Step 3: Common Optimizations

### Add Missing Indexes
\`\`\`sql
-- For frequently filtered columns
CREATE INDEX CONCURRENTLY idx_tickets_tenant_status
ON tickets(tenant_id, status);

-- For text search
CREATE INDEX CONCURRENTLY idx_articles_search
ON kb_articles USING gin(to_tsvector('english', title || ' ' || content));

-- Partial index for common queries
CREATE INDEX CONCURRENTLY idx_tickets_open
ON tickets(tenant_id, created_at DESC)
WHERE status NOT IN ('closed', 'cancelled');
\`\`\`

### Optimize Common Patterns
\`\`\`sql
-- Instead of: SELECT COUNT(*) FROM large_table WHERE ...
-- Use: SELECT reltuples FROM pg_class WHERE relname = 'large_table';

-- Instead of: SELECT * FROM table
-- Select only needed columns: SELECT id, title, status FROM table

-- Use EXISTS instead of IN for subqueries
SELECT * FROM tickets t
WHERE EXISTS (SELECT 1 FROM ticket_comments c WHERE c.ticket_id = t.id);
\`\`\`

## Step 4: Maintenance
\`\`\`sql
-- Update statistics
ANALYZE tickets;

-- Reclaim dead tuple space
VACUUM ANALYZE tickets;

-- Check index health
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey';
\`\`\`` },

    { categoryId: catMap["Database Administration"], title: "Database Backup and Recovery Runbook", slug: "database-backup-recovery-runbook", type: "runbook", tags: ["postgresql","backup","recovery","disaster-recovery"], content: `# Runbook: Database Backup and Recovery

## Backup Strategy
- **Full backup**: Daily at 02:00 UTC (pg_dump)
- **WAL archiving**: Continuous (Point-in-Time Recovery capability)
- **Retention**: 30 days for daily backups, 12 months for monthly

## Taking a Manual Backup
\`\`\`bash
# Full database dump (compressed)
pg_dump -h localhost -U opms -d itd_opms -Fc -f /backups/opms_$(date +%Y%m%d_%H%M%S).dump

# Schema-only (for documentation)
pg_dump -h localhost -U opms -d itd_opms --schema-only -f /backups/schema_$(date +%Y%m%d).sql

# Specific table
pg_dump -h localhost -U opms -d itd_opms -t tickets -Fc -f /backups/tickets_$(date +%Y%m%d).dump
\`\`\`

## Recovery Procedures

### Full Database Restore
\`\`\`bash
# 1. Stop the application
sudo systemctl stop opms-api

# 2. Drop and recreate the database
psql -U postgres -c "DROP DATABASE itd_opms;"
psql -U postgres -c "CREATE DATABASE itd_opms OWNER opms;"

# 3. Restore from dump
pg_restore -h localhost -U opms -d itd_opms -Fc /backups/opms_20260328.dump

# 4. Verify row counts
psql -U opms -d itd_opms -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# 5. Restart application
sudo systemctl start opms-api
\`\`\`

### Point-in-Time Recovery
\`\`\`bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Create recovery.conf
cat > /var/lib/postgresql/15/main/recovery.conf << EOF
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2026-03-28 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 3. Start PostgreSQL (will replay WALs to target time)
sudo systemctl start postgresql
\`\`\`

## Backup Verification Checklist
- [ ] Backup file exists and is non-zero size
- [ ] Backup file is not corrupted: \`pg_restore --list backup.dump\`
- [ ] Monthly test restore to DR environment
- [ ] Verify row counts match production (within tolerance)
- [ ] Application smoke test passes against restored database` },

    { categoryId: catMap["Database Administration"], title: "Database connection pool exhaustion", slug: "db-connection-pool-exhaustion", type: "troubleshooting", tags: ["postgresql","connection-pool","performance","troubleshooting"], content: `# Troubleshooting: Database Connection Pool Exhaustion

## Symptom
Application errors: "too many clients" or "connection pool exhausted". New requests fail while existing ones continue working.

## Diagnostic Steps

### Step 1: Check Current Connections
\`\`\`sql
-- Total connections by state
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = 'itd_opms'
GROUP BY state;

-- Connections by application
SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = 'itd_opms'
GROUP BY application_name, state;

-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
\`\`\`

### Step 2: Check max_connections Setting
\`\`\`sql
SHOW max_connections;  -- Default: 100
SELECT count(*) FROM pg_stat_activity;
\`\`\`

### Step 3: Identify Root Cause

| Cause | Indicator | Fix |
|-------|-----------|-----|
| Connection leak | Connections in \`idle\` state growing over time | Fix application code to close connections |
| Slow queries holding connections | Many connections in \`active\` with long duration | Optimize queries, add timeouts |
| Too many application instances | Connection count = instances × pool_size | Reduce pool size per instance |
| Missing connection pooler | Direct connections from many services | Deploy PgBouncer |
| Idle transaction | Connections in \`idle in transaction\` | Set \`idle_in_transaction_session_timeout\` |

### Step 4: Emergency Fix
\`\`\`sql
-- Kill idle connections older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '10 minutes'
  AND pid <> pg_backend_pid();
\`\`\`

## Application Pool Settings (Go pgx)
\`\`\`go
config.MaxConns = 25          // Max connections
config.MinConns = 5           // Keep-alive connections
config.MaxConnLifetime = 1 * time.Hour
config.MaxConnIdleTime = 30 * time.Minute
config.HealthCheckPeriod = 1 * time.Minute
\`\`\`

## Long-term Fix
Deploy PgBouncer as a connection pooler between application and PostgreSQL.` },

    // ═══ Help Desk & Support ═══
    { categoryId: catMap["Help Desk & Support"], title: "New Employee IT Onboarding Checklist", slug: "new-employee-it-onboarding", type: "how_to", tags: ["onboarding","new-hire","accounts","setup"], content: `# New Employee IT Onboarding Checklist

## Pre-Arrival (HR triggers via OPMS People module)
- [ ] Create Active Directory account
- [ ] Create email account (firstname.lastname@cbn.gov.ng)
- [ ] Assign to appropriate security groups based on role
- [ ] Provision Microsoft 365 license (E3 standard)
- [ ] Create OPMS portal account with correct role
- [ ] Prepare hardware (laptop, monitor, peripherals)
- [ ] Configure VPN access if remote/hybrid

## Day 1 Setup

### Account Activation
1. Hand employee their welcome packet with temporary credentials
2. Guide through first-time password change
3. Set up MFA (Microsoft Authenticator app)
4. Verify email access in Outlook

### Hardware Setup
1. Assign laptop from CMDB (record asset assignment)
2. Configure WiFi: SSID "CBN-Corporate", authenticate with domain credentials
3. Install required software:
   - Microsoft Office 365 (auto-deployed via Intune)
   - VPN client (Cisco AnyConnect)
   - Antivirus (auto-deployed via endpoint management)
4. Test printing to department printer

### Application Access
Based on department/role, grant access to:
- [ ] OPMS Portal (everyone)
- [ ] Core Banking System (if applicable)
- [ ] SharePoint team site
- [ ] Teams channels
- [ ] Department-specific applications

## Day 1 Training
- IT security awareness briefing (30 min)
- OPMS portal walkthrough (30 min)
- Password policy and MFA guide
- IT support channels and escalation

## Follow-up (Week 1)
- [ ] Verify all systems accessible
- [ ] Check email delivery working
- [ ] Confirm VPN access (if applicable)
- [ ] Close onboarding ticket in OPMS` },

    { categoryId: catMap["Help Desk & Support"], title: "Printer Not Working - Troubleshooting Steps", slug: "printer-troubleshooting", type: "troubleshooting", tags: ["printer","troubleshooting","hardware","support"], content: `# Troubleshooting: Printer Not Working

## Quick Fixes (User Self-Service)

### Step 1: Basic Checks
- Is the printer turned on? (Check power light)
- Is there paper in the tray?
- Are there any error messages on the printer display?
- Is the correct printer selected in your application?

### Step 2: Clear Print Queue
1. Open Settings → Printers & Scanners
2. Click on the problem printer
3. Click "Open print queue"
4. Select all jobs → Cancel
5. Try printing again

### Step 3: Restart Print Spooler
\`\`\`
# Run as Administrator
net stop spooler
net start spooler
\`\`\`

### Step 4: Remove and Re-add Printer
1. Settings → Printers & Scanners
2. Remove the problem printer
3. Click "Add a printer"
4. Select the network printer
5. Try printing a test page

## Common Issues

| Problem | Solution |
|---------|----------|
| "Printer offline" | Check network cable/WiFi. Power cycle printer. |
| Paper jam | Follow printer display instructions to clear. Open all trays and access doors. |
| Faded/streaky prints | Replace toner/ink cartridge. Run cleaning cycle from printer menu. |
| Wrong size/orientation | Check Page Setup in application before printing |
| "Access denied" | Your account may not have permission. Submit a ticket. |
| Printer not found | Ensure you're on the correct network VLAN. Try connecting by IP. |

## Escalation
If self-service steps don't resolve:
1. Submit a ticket in OPMS: Category "Hardware" > "Printer Issue"
2. Include: Printer name/location, error message, steps already tried
3. Help Desk will respond within 4 hours` },

    { categoryId: catMap["Help Desk & Support"], title: "How do I reset my password?", slug: "password-reset-faq", type: "faq", tags: ["password","reset","self-service","faq"], content: `# FAQ: How Do I Reset My Password?

## Q: How do I reset my password?
**A:** You have two options:

### Option 1: Self-Service (Recommended)
1. Go to https://passwordreset.microsoftonline.com
2. Enter your email address
3. Complete the MFA verification
4. Set your new password (must meet complexity requirements)

### Option 2: Contact Help Desk
- Call ext. 4357 (HELP)
- Email helpdesk@cbn.gov.ng
- Walk-in: IT Help Desk, Ground Floor, Building A

## Q: What are the password requirements?
**A:**
- Minimum 14 characters
- Must include 3 of: uppercase, lowercase, numbers, symbols
- Cannot reuse your last 12 passwords
- Cannot contain your name or username

## Q: How often must I change my password?
**A:** Every 90 days. You'll receive email reminders at 14 days, 7 days, and 1 day before expiry.

## Q: I'm locked out and can't use self-service. What do I do?
**A:** Call the Help Desk at ext. 4357. Have your employee ID ready for verification. After hours, call the emergency IT line at ext. 9999.

## Q: I changed my password and now Outlook won't connect.
**A:** Close and reopen Outlook. When prompted, enter your new password. If using mobile devices, update the password in your mail app settings.

## Q: Can I use the same password as another system?
**A:** Strongly discouraged. Use a password manager (Bitwarden) to maintain unique passwords for each service.` },

    { categoryId: catMap["Help Desk & Support"], title: "Ticket Escalation Matrix and SLA Guide", slug: "ticket-escalation-matrix-sla", type: "runbook", tags: ["escalation","sla","itsm","support-tiers"], content: `# Ticket Escalation Matrix and SLA Guide

## Support Tiers

### Tier 1 — Help Desk (First Contact)
- Password resets, account unlocks
- Software installation requests
- Basic troubleshooting (printer, email, VPN)
- Knowledge base article referrals
- **Target resolution**: 70% of tickets

### Tier 2 — Technical Support
- Advanced application troubleshooting
- Network connectivity issues
- Server/service restarts
- Security incident triage
- **Escalated from**: Tier 1 after 30 minutes

### Tier 3 — Engineering/Specialists
- Infrastructure changes
- Database issues
- Application bugs
- Security incidents (P1/P2)
- **Escalated from**: Tier 2 after 2 hours (or immediately for P1)

## SLA Targets
| Priority | Response Time | Resolution Time | Update Frequency |
|----------|--------------|-----------------|-----------------|
| P1 - Critical | 15 min | 4 hours | Every 30 min |
| P2 - High | 30 min | 8 hours | Every 2 hours |
| P3 - Medium | 2 hours | 24 hours | Daily |
| P4 - Low | 4 hours | 72 hours | Every 3 days |

## Escalation Triggers
- SLA breach imminent (80% of resolution time elapsed)
- Customer/VIP escalation request
- Multiple tickets for same issue (potential incident)
- Security-related (auto-escalate to Cybersecurity team)

## After-Hours Support
- P1 only: On-call engineer reachable via PagerDuty
- P2-P4: Next business day
- On-call rotation: Weekly, published in OPMS roster` },

    // ═══ Business Continuity ═══
    { categoryId: catMap["Business Continuity"], title: "Business Continuity Plan - IT Systems", slug: "business-continuity-plan-it", type: "runbook", tags: ["bcp","disaster-recovery","continuity","critical-systems"], content: `# Business Continuity Plan — IT Systems

## Critical System Recovery Priority

### Tier 1 — Recover within 1 hour (RTO: 1h)
- Active Directory / Authentication
- Core Banking Interface
- Email and Communication (Teams)
- Network Infrastructure (DNS, DHCP, VPN)

### Tier 2 — Recover within 4 hours (RTO: 4h)
- OPMS Portal and API
- Database Servers
- File Servers
- Backup Systems

### Tier 3 — Recover within 24 hours (RTO: 24h)
- Development Environments
- Monitoring and Logging
- Non-critical Internal Applications
- Print Services

## DR Site Information
- **Location**: Secondary data center
- **Connectivity**: Dedicated fiber link + VPN failover
- **Replication**: Synchronous for Tier 1, asynchronous for Tier 2/3
- **Testing**: Full DR drill conducted quarterly

## Activation Procedure

### Phase 1: Assessment (0-30 min)
1. Incident Commander assesses the situation
2. Determine if BC plan activation is needed
3. Notify: CTO, IT Director, all team leads
4. Establish communication bridge (Teams/phone)

### Phase 2: Activation (30-60 min)
1. Declare BC event
2. Activate DR site
3. Switch DNS to DR systems
4. Verify Tier 1 systems operational

### Phase 3: Stabilization (1-4 hours)
1. Bring up Tier 2 systems
2. Verify data integrity
3. Redirect users to DR environment
4. Monitor performance and capacity

### Phase 4: Recovery (1-7 days)
1. Repair/replace primary site infrastructure
2. Plan failback procedure
3. Execute failback during maintenance window
4. Verify all systems on primary site
5. Conduct post-incident review

## Key Contacts
| Role | Primary | Backup |
|------|---------|--------|
| Incident Commander | IT Director | Deputy Director |
| Network Lead | Network Manager | Senior Network Engineer |
| Systems Lead | Systems Manager | Senior SysAdmin |
| Database Lead | DBA Manager | Senior DBA |
| Security Lead | CISO | Security Analyst |` },

    { categoryId: catMap["Business Continuity"], title: "How often is disaster recovery tested?", slug: "dr-testing-frequency-faq", type: "faq", tags: ["disaster-recovery","testing","compliance","faq"], content: `# FAQ: Disaster Recovery Testing

## Q: How often is DR tested?
**A:** Full DR drills are conducted quarterly. Individual system failover tests are performed monthly.

## Q: What does a DR test involve?
**A:**
1. Simulated failure of primary systems
2. Activation of DR site
3. Verification of all critical services
4. Performance testing under load
5. Data integrity verification
6. Failback to primary site
7. Documentation and lessons learned

## Q: Am I expected to participate?
**A:** If you are on the BC/DR team roster or own a critical system, yes. You'll receive a calendar invite 2 weeks before each drill.

## Q: What happens if the DR test fails?
**A:** The failure is documented, root cause analyzed, and remediation actions are tracked. A re-test is scheduled within 30 days.

## Q: Where are the DR test reports?
**A:** DR test reports are stored in SharePoint: IT Department > Business Continuity > DR Test Reports. They are also uploaded to the GRC module in OPMS.

## Q: Does CBN regulation require DR testing?
**A:** Yes. CBN IT Standards Framework requires documented DR testing at least twice per year. Our quarterly schedule exceeds this requirement.

## Q: What is our RTO and RPO?
**A:**
- **RTO (Recovery Time Objective)**: 1 hour for Tier 1 systems, 4 hours for Tier 2
- **RPO (Recovery Point Objective)**: 0 minutes for Tier 1 (synchronous replication), 15 minutes for Tier 2 (async)` },

    // ═══ Compliance & Governance ═══
    { categoryId: catMap["Compliance & Governance"], title: "NDPR Compliance Checklist for IT Systems", slug: "ndpr-compliance-checklist", type: "how_to", tags: ["ndpr","data-protection","privacy","compliance"], content: `# NDPR Compliance Checklist for IT Systems

## Overview
The Nigeria Data Protection Regulation (NDPR) requires organizations processing personal data to implement appropriate technical and organizational measures. This checklist covers IT system requirements.

## Data Collection and Processing
- [ ] Privacy notices displayed before data collection
- [ ] Consent mechanism implemented and documented
- [ ] Purpose limitation enforced (data used only for stated purpose)
- [ ] Data minimization (only collect what's necessary)
- [ ] Lawful basis documented for each processing activity

## Technical Controls
- [ ] Encryption at rest (AES-256 for databases)
- [ ] Encryption in transit (TLS 1.2+ for all connections)
- [ ] Access controls based on principle of least privilege
- [ ] Audit logging of all access to personal data
- [ ] Data anonymization/pseudonymization where applicable
- [ ] Secure data deletion procedures

## Data Subject Rights
Ensure systems can support:
- [ ] Right of access (export user data)
- [ ] Right to rectification (update personal data)
- [ ] Right to erasure (delete upon request)
- [ ] Right to data portability (export in machine-readable format)
- [ ] Right to restrict processing

## Breach Notification
- [ ] Breach detection mechanisms in place
- [ ] Incident response plan includes NDPR notification requirements
- [ ] Ability to notify NITDA within 72 hours of breach discovery
- [ ] Template breach notification letters prepared

## Data Protection Impact Assessment (DPIA)
Required for:
- New systems processing personal data
- Changes to existing personal data processing
- Large-scale processing of sensitive data

## Record Keeping
- [ ] Data processing activities register maintained
- [ ] Data protection officer (DPO) appointed
- [ ] Annual compliance audit conducted
- [ ] Staff training on data protection completed` },

    { categoryId: catMap["Compliance & Governance"], title: "Audit Trail and Evidence Collection Guide", slug: "audit-trail-evidence-collection", type: "best_practice", tags: ["audit","evidence","compliance","governance"], content: `# Audit Trail and Evidence Collection Guide

## Audit Trail Requirements

### What Must Be Logged
| Event Type | Details to Capture | Retention |
|-----------|-------------------|-----------|
| Authentication | User ID, timestamp, IP, success/failure, MFA method | 365 days |
| Authorization | User, resource, action, decision (allow/deny) | 365 days |
| Data access | User, data type, records accessed, timestamp | 365 days |
| Data modification | User, before/after values, timestamp | 365 days |
| Configuration changes | User, setting, old/new value, timestamp | 365 days |
| System events | Startup, shutdown, errors, patches applied | 180 days |

### Log Format Standard
All system logs must include:
- Timestamp (ISO 8601, UTC)
- Correlation ID (for request tracing)
- User ID and tenant ID
- Action performed
- Resource affected
- Result (success/failure)
- Source IP address

## Evidence Collection for Audits

### Preparing for an Audit
1. Identify the scope and timeframe
2. Query audit logs from OPMS GRC module
3. Export evidence in tamper-evident format (signed exports)
4. Organize by control objective
5. Prepare summary narratives for each control

### Evidence Types
- **Automated**: System-generated logs, configuration exports, scan results
- **Manual**: Screenshots, attestation forms, meeting minutes, approval emails
- **Hybrid**: Reports generated from system data with analyst commentary

### Best Practices
- Never modify or delete audit logs
- Store evidence in the OPMS Evidence Vault (tamper-evident storage)
- Use checksums to verify evidence integrity
- Maintain chain of custody documentation
- Retain evidence for the full audit cycle plus 1 year` },

    { categoryId: catMap["Compliance & Governance"], title: "What regulations apply to our IT systems?", slug: "it-regulations-faq", type: "faq", tags: ["regulations","cbn","compliance","governance"], content: `# FAQ: What Regulations Apply to Our IT Systems?

## Q: What are the key regulations?
**A:** ITD systems must comply with:

1. **CBN IT Standards Framework** — Comprehensive IT governance requirements for financial institutions
2. **NDPR (Nigeria Data Protection Regulation)** — Personal data protection requirements
3. **CBN Risk-Based Cybersecurity Framework** — Security controls and incident reporting
4. **ISO 27001** — Information security management system standard
5. **COBIT** — IT governance and management framework
6. **PCI DSS** — Payment card data security (for card processing systems)

## Q: Who is responsible for compliance?
**A:**
- **CISO**: Overall security compliance
- **DPO**: Data protection (NDPR)
- **IT Director**: IT governance and operations
- **GRC Team**: Monitoring, reporting, audit coordination
- **All staff**: Adherence to policies and procedures

## Q: How is compliance monitored?
**A:** Through the OPMS GRC module:
- Continuous control monitoring
- Automated compliance scoring
- Quarterly assessments
- Annual external audits
- Risk register updates

## Q: What happens if we're non-compliant?
**A:** Consequences include:
- CBN sanctions and fines
- Regulatory remediation orders
- Reputational damage
- Personal liability for responsible officers
- Potential license implications

## Q: Where do I report a compliance concern?
**A:** Report through any of these channels:
- OPMS GRC module → Compliance Issues
- Email: compliance@cbn.gov.ng
- Anonymous hotline: ext. 7777` },

    // ═══ Project Management ═══
    { categoryId: catMap["Project Management"], title: "Agile Sprint Planning Guide", slug: "agile-sprint-planning-guide", type: "how_to", tags: ["agile","scrum","sprint","planning"], content: `# Agile Sprint Planning Guide

## Sprint Parameters
- **Duration**: 2 weeks (10 business days)
- **Ceremonies**: Planning, Daily Standup, Review, Retrospective
- **Tools**: OPMS Planning module for tracking

## Sprint Planning Meeting

### Preparation (Before Meeting)
- Product Owner: Prioritize and refine backlog
- Scrum Master: Review team capacity (vacations, training, on-call duties)
- Team: Review upcoming stories, identify blockers

### Meeting Structure (2 hours max)

#### Part 1: What (45 min)
1. Product Owner presents sprint goal
2. Walk through prioritized stories
3. Team asks clarifying questions
4. Accept/modify sprint goal

#### Part 2: How (45 min)
1. Break stories into tasks
2. Estimate tasks (hours or story points)
3. Identify dependencies
4. Assign initial owners

#### Part 3: Commitment (30 min)
1. Review total capacity vs committed work
2. Team confirms sprint commitment
3. Identify risks and mitigation plans
4. Document sprint backlog

## Estimation Guidelines
| Points | Complexity | Example |
|--------|-----------|---------|
| 1 | Trivial | Config change, text update |
| 2 | Simple | Single function, well-defined |
| 3 | Moderate | Multiple files, clear approach |
| 5 | Complex | Multiple components, some unknowns |
| 8 | Very complex | Cross-system, significant design needed |
| 13 | Epic-level | Break down further before committing |

## Velocity Tracking
- Track velocity per sprint in OPMS
- Use 3-sprint average for capacity planning
- Adjust for holidays and team changes
- Don't inflate points — consistency matters more than the number` },

    { categoryId: catMap["Project Management"], title: "Project Status Reporting Template", slug: "project-status-reporting-template", type: "best_practice", tags: ["reporting","status","governance","pmo"], content: `# Project Status Reporting Template

## Weekly Status Report Structure

### Header
- Project Name
- Report Date
- Project Manager
- Overall Status: GREEN / AMBER / RED

### Status Definitions
| Color | Meaning |
|-------|---------|
| GREEN | On track — no significant risks or issues |
| AMBER | At risk — issues exist but mitigation is in progress |
| RED | Off track — immediate escalation/intervention needed |

### Report Sections

#### 1. Executive Summary (2-3 sentences)
What happened this week and what's the overall trajectory?

#### 2. Key Accomplishments
- Bullet list of completed deliverables
- Milestones achieved

#### 3. Planned Activities (Next Week)
- What will be worked on
- Key decisions needed

#### 4. Risks and Issues
| # | Description | Impact | Probability | Mitigation | Owner |
|---|-------------|--------|-------------|------------|-------|
| R1 | Example risk | High | Medium | Mitigation plan | Name |

#### 5. Metrics
- Budget: Planned vs Actual (%)
- Schedule: On track / X days ahead/behind
- Scope: Changes since baseline
- Quality: Defect count / test pass rate

#### 6. Decisions Needed
- List decisions required from steering committee
- Include options and recommendation

## Submission Schedule
- Weekly reports: Due every Friday by 16:00
- Monthly dashboard: Due 3rd business day of month
- Submit via OPMS Planning module` },

    { categoryId: catMap["Project Management"], title: "What project management methodology do we use?", slug: "project-management-methodology-faq", type: "faq", tags: ["methodology","agile","waterfall","governance"], content: `# FAQ: What Project Management Methodology Do We Use?

## Q: What methodology does ITD follow?
**A:** We use a hybrid approach:
- **Agile (Scrum)** for software development and iterative projects
- **Waterfall** for infrastructure projects with fixed scope and regulatory requirements
- **Kanban** for BAU (business as usual) and support work

## Q: How do I choose the right methodology?
**A:**
- **Use Agile when**: Requirements may evolve, stakeholder feedback is frequent, delivery can be incremental
- **Use Waterfall when**: Scope is fixed, regulatory deliverables are defined, sequential dependencies exist
- **Use Kanban when**: Continuous flow of varied tasks, no fixed sprints, support/maintenance work

## Q: What tools do we use?
**A:** OPMS Planning module is the primary tool for all project tracking. It supports:
- Project creation and milestone tracking
- Sprint/iteration management
- Budget tracking
- Resource allocation
- Status reporting

## Q: Who approves new projects?
**A:** All projects require:
1. Business case submission via OPMS
2. IT Steering Committee approval (for projects > ₦5M or cross-departmental)
3. Budget allocation confirmation from Finance

## Q: What are the mandatory project deliverables?
**A:**
- Project charter
- Weekly status reports
- Risk register (updated bi-weekly)
- Change log
- Lessons learned (at project close)
- Post-implementation review (30 days after go-live)

## Q: How is project success measured?
**A:** Against the triple constraint:
- **Scope**: All requirements delivered and accepted
- **Time**: Completed within approved timeline (±10%)
- **Budget**: Within approved budget (±5%)
Plus: Stakeholder satisfaction score and defect rate` },

    // ═══ Additional cross-cutting articles ═══
    { categoryId: catMap["IT Operations"], title: "SSL/TLS Certificate Renewal Runbook", slug: "ssl-tls-certificate-renewal-runbook", type: "runbook", tags: ["ssl","tls","certificates","security","runbook"], content: `# Runbook: SSL/TLS Certificate Renewal

## Certificate Inventory
Monitor all certificates via OPMS CMDB Warranty/Renewal alerts. Critical certificates:
- *.cbn.gov.ng (wildcard)
- opms.cbn.gov.ng
- mail.cbn.gov.ng
- vpn.cbn.gov.ng

## Renewal Timeline
- **90 days before expiry**: Automated alert generated
- **60 days**: Generate CSR and submit to CA
- **30 days**: Install new certificate in staging
- **14 days**: Install in production during maintenance window
- **7 days**: CRITICAL — if not renewed, escalate immediately

## Renewal Steps

### 1. Generate CSR
\`\`\`bash
openssl req -new -newkey rsa:2048 -nodes \\
  -keyout server.key -out server.csr \\
  -subj "/C=NG/ST=FCT/L=Abuja/O=Central Bank of Nigeria/CN=opms.cbn.gov.ng"
\`\`\`

### 2. Submit to Certificate Authority
- Submit CSR to approved CA
- Complete domain validation
- Download certificate chain (cert + intermediate + root)

### 3. Install Certificate
\`\`\`bash
# Verify certificate matches key
openssl x509 -noout -modulus -in server.crt | md5sum
openssl rsa -noout -modulus -in server.key | md5sum
# Both must match

# Install on Nginx
sudo cp server.crt /etc/nginx/ssl/
sudo cp server.key /etc/nginx/ssl/
sudo nginx -t && sudo systemctl reload nginx
\`\`\`

### 4. Verify
\`\`\`bash
echo | openssl s_client -connect opms.cbn.gov.ng:443 2>/dev/null | openssl x509 -noout -dates
\`\`\`

## Emergency: Certificate Already Expired
1. Users will see browser security warnings
2. Install new certificate immediately (emergency change)
3. If CA delivery is delayed, generate a self-signed cert as temporary measure
4. Conduct post-incident review to prevent recurrence` },

    { categoryId: catMap["Cybersecurity"], title: "Endpoint Security Configuration Standards", slug: "endpoint-security-configuration", type: "best_practice", tags: ["endpoint","security","hardening","configuration"], content: `# Endpoint Security Configuration Standards

## Windows Workstation Hardening

### Operating System
- Windows 11 Enterprise (latest feature update)
- Automatic Windows Updates enabled
- BitLocker drive encryption enabled
- Windows Firewall enabled (all profiles)

### Antivirus / EDR
- Microsoft Defender for Endpoint (deployed via Intune)
- Real-time protection: Enabled
- Cloud-delivered protection: Enabled
- Tamper protection: Enabled
- Attack surface reduction rules: Enabled

### Application Control
- Only IT-approved applications may be installed
- AppLocker policies enforced via Group Policy
- Blocked: PowerShell scripts from user directories, unsigned executables

### Browser Security
- Microsoft Edge (managed, default browser)
- SmartScreen filter: Enabled
- Password manager: Disabled (use Bitwarden)
- Extensions: Only from approved list

### Network
- DNS over HTTPS: Enabled (pointing to corporate DNS)
- WiFi: Auto-connect only to CBN-Corporate
- Bluetooth: Disabled unless specifically needed
- USB storage: Blocked via endpoint policy

## macOS Hardening
- FileVault encryption: Enabled
- Gatekeeper: Enabled (App Store and identified developers)
- Firewall: Enabled
- Automatic updates: Enabled
- Managed via Intune MDM profile

## Compliance Verification
- Monthly automated compliance scan via Intune
- Non-compliant devices blocked from corporate network
- Quarterly manual audit of 10% of endpoints
- Results reported to CISO and GRC module` },

    { categoryId: catMap["Database Administration"], title: "Database User Access Review Process", slug: "database-user-access-review", type: "how_to", tags: ["database","access-control","audit","security"], content: `# Database User Access Review Process

## Overview
All database accounts must be reviewed quarterly to ensure compliance with least-privilege principles and regulatory requirements (CBN IT Standards, NDPR).

## Review Schedule
- **Q1 Review**: January 15-31
- **Q2 Review**: April 15-30
- **Q3 Review**: July 15-31
- **Q4 Review**: October 15-31

## Review Procedure

### Step 1: Generate Account Report
\`\`\`sql
-- List all database users and their privileges
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin,
       rolconnlimit, rolvaliduntil
FROM pg_roles
WHERE rolcanlogin = true
ORDER BY rolname;

-- Check table-level permissions
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY grantee, table_schema, table_name;
\`\`\`

### Step 2: Cross-Reference with Active Employees
- Compare DB accounts against HR active employee list
- Flag accounts for:
  - Terminated employees (immediate revocation)
  - Role changes (permission adjustment)
  - Unused accounts (>90 days no login)

### Step 3: Validate Access Levels
For each active account:
- [ ] Is the access level appropriate for their role?
- [ ] Are superuser/admin privileges justified?
- [ ] Is direct database access necessary or can they use the application?
- [ ] Are there any shared/generic accounts? (Must be eliminated)

### Step 4: Remediate and Document
- Revoke unnecessary privileges
- Disable inactive accounts
- Document exceptions with business justification
- Update access matrix in OPMS GRC module
- Sign-off by database owner and security team

## Service Account Standards
- Named accounts only (no shared credentials)
- Minimum required privileges
- Passwords stored in HashiCorp Vault
- Rotated every 60 days
- Monitored for anomalous activity` },

    { categoryId: catMap["Network Engineering"], title: "Wireless Network Troubleshooting", slug: "wireless-network-troubleshooting", type: "troubleshooting", tags: ["wifi","wireless","connectivity","troubleshooting"], content: `# Troubleshooting: Wireless Network Issues

## "Cannot Connect to WiFi"

### Step 1: Verify Correct Network
- Corporate: **CBN-Corporate** (802.1X authentication)
- Guest: **CBN-Guest** (captive portal, no corporate access)
- Do NOT connect to unknown/personal hotspots

### Step 2: Forget and Reconnect
1. Go to WiFi settings
2. Forget "CBN-Corporate"
3. Reconnect and enter domain credentials
4. Accept the certificate if prompted

### Step 3: Check Device Compliance
- Is the device managed by Intune? (Required for CBN-Corporate)
- Is the OS up to date?
- Is the antivirus running?
- Non-compliant devices are blocked by NAC (Network Access Control)

## "Connected but No Internet"

### Step 1: Check IP Assignment
\`\`\`bash
ipconfig /all    # Windows
ip addr show     # Linux
ifconfig         # macOS
\`\`\`
- Should have 10.0.40.x address (User VLAN)
- If 169.254.x.x: DHCP failure — reconnect or contact network team

### Step 2: Test DNS
\`\`\`bash
nslookup google.com
nslookup intranet.cbn.gov.ng
\`\`\`

### Step 3: Test Gateway
\`\`\`bash
ping 10.0.40.1   # Default gateway
\`\`\`

## "Slow WiFi"

### Common Causes
| Cause | Solution |
|-------|----------|
| Distance from AP | Move closer or request AP survey |
| Channel congestion | Network team will adjust channels |
| Too many devices on AP | May need additional APs |
| Interference | Identify sources (microwaves, Bluetooth) |
| Old WiFi driver | Update device drivers |

## Escalation
Include in your ticket:
- Device type and OS version
- WiFi MAC address
- Floor/room location
- Time of issue
- Screenshot of WiFi diagnostics` },

    { categoryId: catMap["Cloud & Virtualization"], title: "Container Orchestration with Docker Compose", slug: "docker-compose-orchestration-guide", type: "how_to", tags: ["docker","docker-compose","containers","deployment"], content: `# Container Orchestration with Docker Compose

## Overview
Docker Compose is used for local development and staging environments. Production uses Kubernetes for full orchestration.

## Project Structure
\`\`\`
project/
├── docker-compose.yml
├── docker-compose.override.yml  # Local dev overrides
├── docker-compose.prod.yml      # Production overrides
├── .env                         # Environment variables
├── api/
│   └── Dockerfile
└── portal/
    └── Dockerfile
\`\`\`

## Base Configuration
\`\`\`yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./api
    ports:
      - "8089:8089"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=itd_opms
      - REDIS_HOST=redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8089/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  portal:
    build: ./portal
    ports:
      - "3004:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8089/api/v1

  postgres:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=itd_opms
      - POSTGRES_USER=opms
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opms"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
\`\`\`

## Common Commands
\`\`\`bash
docker compose up -d                    # Start all services
docker compose logs -f api              # Follow API logs
docker compose exec postgres psql -U opms -d itd_opms  # DB shell
docker compose down                     # Stop all services
docker compose down -v                  # Stop and remove volumes
docker compose build --no-cache api     # Rebuild API image
\`\`\`

## Health Monitoring
\`\`\`bash
docker compose ps          # Check service status
docker stats               # Resource usage
docker compose top         # Running processes
\`\`\`` },

    { categoryId: catMap["Business Continuity"], title: "Data Classification and Handling Policy", slug: "data-classification-handling-policy", type: "best_practice", tags: ["data-classification","security","policy","governance"], content: `# Data Classification and Handling Policy

## Classification Levels

### Level 1: Public
- **Definition**: Information approved for public release
- **Examples**: Published reports, press releases, public website content
- **Handling**: No restrictions on sharing or storage
- **Labeling**: No label required

### Level 2: Internal
- **Definition**: General business information for internal use
- **Examples**: Internal memos, meeting notes, project plans, policies
- **Handling**: Share freely within the organization, don't publish externally
- **Labeling**: "INTERNAL USE ONLY"

### Level 3: Confidential
- **Definition**: Sensitive business information that could cause harm if disclosed
- **Examples**: Financial data, strategic plans, vendor contracts, employee records
- **Handling**:
  - Encrypt in transit and at rest
  - Access limited to need-to-know basis
  - Don't share via personal email or messaging
  - Store only on approved systems
- **Labeling**: "CONFIDENTIAL"

### Level 4: Restricted
- **Definition**: Highly sensitive information with regulatory or legal requirements
- **Examples**: Customer financial data, authentication credentials, cryptographic keys, PII, audit findings
- **Handling**:
  - Strong encryption required (AES-256)
  - Access requires management approval
  - Full audit logging of all access
  - Never store on personal devices
  - Breach notification required within 72 hours
- **Labeling**: "RESTRICTED"

## IT System Requirements by Classification

| Requirement | Internal | Confidential | Restricted |
|-------------|----------|-------------|------------|
| Encryption at rest | Optional | Required | Required (AES-256) |
| Encryption in transit | TLS 1.2+ | TLS 1.2+ | TLS 1.3 preferred |
| Access control | Role-based | Need-to-know | Individual approval |
| Audit logging | Basic | Detailed | Full (tamper-evident) |
| Backup encryption | Optional | Required | Required |
| Data retention | As needed | Per policy | Per regulation |
| Disposal | Standard delete | Secure wipe | Certified destruction |` },

    { categoryId: catMap["Help Desk & Support"], title: "Microsoft Teams Quick Start Guide", slug: "microsoft-teams-quick-start", type: "how_to", tags: ["teams","communication","collaboration","microsoft"], content: `# Microsoft Teams Quick Start Guide

## Getting Started

### Access Teams
- **Desktop**: Download from https://teams.microsoft.com
- **Web**: Open https://teams.microsoft.com in Edge or Chrome
- **Mobile**: Install "Microsoft Teams" from App Store / Play Store
- Sign in with your @cbn.gov.ng credentials

## Key Features

### Chat
- **1:1 chat**: Click "Chat" → "New chat" → type person's name
- **Group chat**: Create with up to 250 people
- **Format messages**: Bold, italic, lists, code blocks
- **Share files**: Drag and drop or click the attachment icon

### Teams & Channels
- **Teams**: Organized by department or project
- **Channels**: Topics within a team (General, Announcements, etc.)
- **@mentions**: Use @name to notify someone, @team for everyone
- **Pin important messages**: Right-click → Pin

### Meetings
- **Schedule**: Calendar → New meeting → Add attendees
- **Join**: Click "Join" from calendar or meeting link
- **Screen share**: Click "Share" icon → Choose screen or window
- **Record**: Click "..." → Start recording (saved to OneDrive)
- **Background**: Settings → Background effects → Blur or custom

### Files
- Each channel has a "Files" tab (SharePoint backed)
- Co-edit documents in real-time
- Version history available

## Etiquette Guidelines
- Set your status (Available, Busy, Away, Do Not Disturb)
- Use channels for team discussions (not group chats)
- Keep @everyone mentions for truly important announcements
- Mute notifications for busy channels if needed
- Use threads to keep conversations organized

## Troubleshooting
- **Can't sign in**: Clear browser cache or reinstall desktop app
- **No audio in meetings**: Check Settings → Devices → Audio devices
- **Poor video quality**: Close bandwidth-heavy applications, use wired connection
- **Missing team**: Ask the team owner to add you, or request via Help Desk` },

    { categoryId: catMap["Software Development"], title: "API Design Standards and Conventions", slug: "api-design-standards-conventions", type: "best_practice", tags: ["api","rest","standards","development"], content: `# API Design Standards and Conventions

## URL Structure
\`\`\`
/api/v1/{module}/{resource}
/api/v1/{module}/{resource}/{id}
/api/v1/{module}/{resource}/{id}/{sub-resource}
\`\`\`

### Naming Rules
- Use plural nouns: \`/tickets\` not \`/ticket\`
- Use kebab-case for multi-word resources: \`/skill-categories\`
- Use camelCase for query parameters: \`?pageSize=20\`
- Never include verbs in URLs (use HTTP methods instead)

## HTTP Methods
| Method | Purpose | Request Body | Response |
|--------|---------|-------------|----------|
| GET | Read resource(s) | No | 200 with data |
| POST | Create resource | Yes | 201 with created resource |
| PUT | Full update | Yes | 200 with updated resource |
| PATCH | Partial update | Yes | 200 with updated resource |
| DELETE | Remove resource | No | 204 No Content |

## Response Envelope
All responses follow this structure:
\`\`\`json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
\`\`\`

Error responses:
\`\`\`json
{
  "status": "error",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Title is required",
      "field": "title"
    }
  ]
}
\`\`\`

## Pagination
- Default: \`page=1&limit=20\`
- Maximum limit: 100
- Always return meta with total count

## Filtering
- Use query parameters: \`?status=active&priority=high\`
- Use camelCase: \`?categoryId=xxx\`
- Support multiple values where logical: \`?status=open,in_progress\`

## Error Codes
| HTTP Status | Code | When |
|-------------|------|------|
| 400 | BAD_REQUEST | Malformed request |
| 400 | VALIDATION_ERROR | Field validation failed |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate or state conflict |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |` },
  ];
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Knowledge Base Seed ===\n");

  // 1. Login
  console.log("Logging in...");
  const token = await login();
  console.log("Authenticated.\n");

  // 2. Create categories
  console.log("Creating categories...");
  const catMap = {};
  for (const cat of CATEGORIES) {
    const result = await apiPost(token, "/knowledge/categories", cat);
    if (result.ok) {
      catMap[cat.name] = result.data.id;
      console.log(`  ✓ ${cat.name} (${result.data.id})`);
    } else if (result.status === 409) {
      console.log(`  ~ ${cat.name} (already exists)`);
    } else {
      console.error(`  ✗ ${cat.name}: ${JSON.stringify(result.json)}`);
    }
    await sleep(200);
  }
  console.log(`\nCategories created: ${Object.keys(catMap).length}\n`);

  // If categories already existed, fetch them
  if (Object.keys(catMap).length < CATEGORIES.length) {
    console.log("Fetching existing categories...");
    const res = await fetch(`${API}/knowledge/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const cats = json.data?.data || json.data || [];
    for (const c of cats) {
      if (!catMap[c.name]) catMap[c.name] = c.id;
    }
    console.log(`Total categories mapped: ${Object.keys(catMap).length}\n`);
  }

  // 3. Create articles
  const allArticles = articles(catMap);
  console.log(`Creating ${allArticles.length} articles...`);
  let created = 0, skipped = 0, failed = 0;

  for (const article of allArticles) {
    const result = await apiPost(token, "/knowledge/articles", article);
    if (result.ok) {
      created++;
      const id = result.data.id;
      console.log(`  ✓ [${article.type}] ${article.title}`);

      // Publish the article
      const pubResult = await apiPost(token, `/knowledge/articles/${id}/publish`, {});
      if (!pubResult.ok) {
        console.log(`    ⚠ Publish failed: ${JSON.stringify(pubResult.json)}`);
      }
    } else if (result.status === 409) {
      skipped++;
      console.log(`  ~ [${article.type}] ${article.title} (exists)`);
    } else {
      failed++;
      console.error(`  ✗ [${article.type}] ${article.title}: ${JSON.stringify(result.json)}`);
    }
    await sleep(300);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Categories: ${Object.keys(catMap).length}`);
  console.log(`Articles created: ${created}`);
  console.log(`Articles skipped: ${skipped}`);
  console.log(`Articles failed: ${failed}`);
  console.log(`Total articles attempted: ${allArticles.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
