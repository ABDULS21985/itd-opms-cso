-- +goose Up
-- Migration 035: Seed 20 skill categories and 100 skills for Application Development & Management
-- Seeds: 20 categories, 100 skills

-- ══════════════════════════════════════════════
-- Skill Categories: 20 Application Development & Management Categories
-- ══════════════════════════════════════════════

INSERT INTO skill_categories (id, tenant_id, name, description, parent_id, created_at, updated_at) VALUES
  -- Core Development
  ('ca000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Frontend Development',        'Client-side web application development including UI/UX implementation',                    NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Backend Development',          'Server-side application logic, APIs, and business process implementation',                  NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Mobile Development',           'Native and cross-platform mobile application development',                                 NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Database Management',          'Database design, administration, optimization, and data modeling',                          NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Cloud & Infrastructure',       'Cloud platforms, containerization, and infrastructure management',                          NULL, NOW(), NOW()),

  -- Engineering Practices
  ('ca000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'DevOps & CI/CD',               'Continuous integration, delivery, deployment pipelines, and automation',                    NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Testing & Quality Assurance',  'Software testing methodologies, test automation, and quality assurance',                    NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Security & Compliance',        'Application security, vulnerability management, and regulatory compliance',                NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Software Architecture',        'System design, architectural patterns, and technical decision-making',                      NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'API Design & Integration',     'RESTful API design, GraphQL, third-party integrations, and middleware',                     NULL, NOW(), NOW()),

  -- Data & AI
  ('ca000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Data Engineering',             'Data pipelines, ETL processes, data warehousing, and big data technologies',                NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'AI & Machine Learning',        'Artificial intelligence, machine learning models, and intelligent automation',              NULL, NOW(), NOW()),

  -- Management & Process
  ('ca000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Project Management',           'Project planning, execution, monitoring, and delivery methodologies',                       NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Agile & Scrum',                'Agile frameworks, Scrum ceremonies, Kanban, and iterative development',                     NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'IT Service Management',        'ITIL practices, incident management, change management, and service delivery',              NULL, NOW(), NOW()),

  -- Design & UX
  ('ca000001-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'UI/UX Design',                 'User interface design, user experience research, prototyping, and usability',               NULL, NOW(), NOW()),

  -- Operations & Monitoring
  ('ca000001-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'Monitoring & Observability',   'Application monitoring, logging, alerting, and performance observability',                  NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'Networking & Systems',         'Network administration, system administration, and infrastructure operations',              NULL, NOW(), NOW()),

  -- Governance & Strategy
  ('ca000001-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'Enterprise Application Management', 'Enterprise software lifecycle management, ERP, CRM, and LOB applications',            NULL, NOW(), NOW()),
  ('ca000001-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'IT Governance & Strategy',     'IT governance frameworks, strategic planning, portfolio management, and risk assessment',   NULL, NOW(), NOW());


-- ══════════════════════════════════════════════
-- Skills: 100 Skills across 20 Categories
-- ══════════════════════════════════════════════

INSERT INTO skills (id, tenant_id, category_id, name, description, created_at, updated_at) VALUES

  -- ── 1. Frontend Development (5 skills) ──
  ('ab000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'React.js',               'Building interactive UIs with React, hooks, state management, and component lifecycle',                  NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'Next.js',                'Server-side rendering, static generation, and full-stack React applications with Next.js',              NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'TypeScript',             'Strongly-typed JavaScript development for scalable and maintainable frontend code',                     NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'CSS & Tailwind CSS',     'Modern CSS, responsive design, utility-first styling with Tailwind CSS',                                NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'Angular',                'Enterprise frontend development using Angular framework with RxJS and dependency injection',            NOW(), NOW()),

  -- ── 2. Backend Development (5 skills) ──
  ('ab000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000002', 'Go (Golang)',            'Building high-performance backend services, APIs, and microservices with Go',                           NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000002', 'Node.js',                'Server-side JavaScript runtime for building scalable network applications',                             NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000002', 'Python',                 'Backend development with Python including Django, Flask, and FastAPI frameworks',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000002', 'Java / Spring Boot',     'Enterprise Java development with Spring Boot, dependency injection, and microservice patterns',          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000002', 'C# / .NET',              'Microsoft .NET ecosystem for building web APIs, services, and enterprise applications',                 NOW(), NOW()),

  -- ── 3. Mobile Development (5 skills) ──
  ('ab000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000003', 'React Native',           'Cross-platform mobile app development using React Native and Expo',                                     NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000003', 'Flutter',                'Cross-platform mobile development with Flutter and Dart for iOS and Android',                           NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000003', 'iOS Development (Swift)', 'Native iOS application development using Swift and UIKit/SwiftUI',                                      NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000003', 'Android Development (Kotlin)', 'Native Android application development using Kotlin and Jetpack Compose',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000003', 'Mobile App Testing',     'Mobile-specific testing including device testing, app store compliance, and performance profiling',      NOW(), NOW()),

  -- ── 4. Database Management (5 skills) ──
  ('ab000001-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000004', 'PostgreSQL',             'Advanced PostgreSQL administration, query optimization, and database design',                           NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000004', 'Microsoft SQL Server',   'SQL Server administration, T-SQL development, and performance tuning',                                  NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000004', 'MongoDB',                'NoSQL database design, aggregation pipelines, and document-oriented data modeling',                     NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000004', 'Redis',                  'In-memory data store for caching, session management, and real-time messaging',                         NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000004', 'Database Design & Modeling', 'Relational and non-relational data modeling, normalization, and schema design',                      NOW(), NOW()),

  -- ── 5. Cloud & Infrastructure (5 skills) ──
  ('ab000001-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000005', 'Microsoft Azure',        'Azure cloud services including App Service, Functions, AKS, and Azure DevOps',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000005', 'Amazon Web Services (AWS)', 'AWS services including EC2, S3, Lambda, RDS, and CloudFormation',                                    NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000005', 'Docker',                 'Container creation, Docker Compose, multi-stage builds, and container optimization',                    NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000005', 'Kubernetes',             'Container orchestration, cluster management, Helm charts, and service mesh',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000005', 'Infrastructure as Code (Terraform)', 'Declarative infrastructure provisioning with Terraform, Pulumi, or CloudFormation',             NOW(), NOW()),

  -- ── 6. DevOps & CI/CD (5 skills) ──
  ('ab000001-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000006', 'GitHub Actions',         'CI/CD pipeline authoring with GitHub Actions workflows, reusable actions, and matrix builds',           NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000006', 'Jenkins',                'Jenkins pipeline configuration, Jenkinsfile development, and plugin management',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000006', 'GitLab CI/CD',           'GitLab pipeline configuration, runners, and integrated DevOps workflows',                               NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000006', 'Git & Version Control',  'Advanced Git workflows, branching strategies, rebasing, and collaborative development',                 NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000006', 'Release Management',     'Software release planning, versioning, changelog management, and deployment coordination',              NOW(), NOW()),

  -- ── 7. Testing & Quality Assurance (5 skills) ──
  ('ab000001-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000007', 'Unit Testing',           'Writing unit tests with Jest, Go testing, pytest, and JUnit for reliable code coverage',                NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000007', 'Integration Testing',    'API integration testing, contract testing, and service-level test strategies',                           NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000007', 'End-to-End Testing',     'Browser automation with Playwright, Cypress, or Selenium for full workflow testing',                     NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000007', 'Performance Testing',    'Load testing, stress testing, and performance benchmarking with JMeter or k6',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000007', 'Code Review & Static Analysis', 'Code review best practices, linting, SonarQube, and static code analysis tools',                  NOW(), NOW()),

  -- ── 8. Security & Compliance (5 skills) ──
  ('ab000001-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000008', 'Application Security (OWASP)', 'OWASP Top 10, secure coding practices, and vulnerability remediation',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000008', 'Identity & Access Management', 'OAuth 2.0, OpenID Connect, SAML, RBAC, and authentication/authorization patterns',                NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000008', 'Penetration Testing',    'Security assessments, vulnerability scanning, and ethical hacking techniques',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000008', 'Data Privacy & NDPR',    'Data protection compliance, NDPR, GDPR, encryption, and data handling policies',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000008', 'Security Incident Response', 'Incident detection, response playbooks, forensics, and post-incident review processes',             NOW(), NOW()),

  -- ── 9. Software Architecture (5 skills) ──
  ('ab000001-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000009', 'Microservices Architecture', 'Designing and implementing microservices, service decomposition, and inter-service communication',  NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000009', 'Event-Driven Architecture', 'Event sourcing, CQRS, message brokers (Kafka, RabbitMQ), and asynchronous patterns',               NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000009', 'Design Patterns',        'GoF patterns, domain-driven design, SOLID principles, and clean architecture',                         NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000009', 'System Design',          'Large-scale system design, scalability, high availability, and distributed systems',                    NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000009', 'Technical Documentation', 'Architecture decision records (ADRs), technical specs, and system documentation',                       NOW(), NOW()),

  -- ── 10. API Design & Integration (5 skills) ──
  ('ab000001-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000010', 'RESTful API Design',     'REST principles, resource modeling, versioning, pagination, and HATEOAS',                               NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000010', 'GraphQL',                'GraphQL schema design, resolvers, subscriptions, and Apollo/Relay clients',                             NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000010', 'gRPC & Protocol Buffers', 'High-performance RPC with gRPC, protobuf schema design, and streaming',                                NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000049', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000010', 'Webhook & Event Integration', 'Designing webhook systems, event delivery, retry logic, and third-party integrations',             NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000010', 'API Gateway & Management', 'API gateway configuration, rate limiting, throttling, and API lifecycle management',                  NOW(), NOW()),

  -- ── 11. Data Engineering (5 skills) ──
  ('ab000001-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000011', 'ETL Pipeline Development', 'Building extract-transform-load pipelines with Apache Airflow, dbt, or SSIS',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000011', 'Data Warehousing',       'Data warehouse design, dimensional modeling, star/snowflake schemas',                                   NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000011', 'Apache Kafka',           'Event streaming with Kafka, topic design, consumer groups, and stream processing',                      NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000011', 'Data Visualization',     'Creating dashboards and reports with Power BI, Grafana, or Tableau',                                   NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000055', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000011', 'SQL & Query Optimization', 'Advanced SQL writing, query plan analysis, indexing strategies, and performance tuning',              NOW(), NOW()),

  -- ── 12. AI & Machine Learning (5 skills) ──
  ('ab000001-0000-0000-0000-000000000056', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000012', 'Machine Learning Fundamentals', 'Supervised/unsupervised learning, model training, evaluation, and feature engineering',            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000057', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000012', 'Natural Language Processing', 'NLP techniques, text classification, sentiment analysis, and language models',                     NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000058', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000012', 'LLM Integration & Prompt Engineering', 'Integrating large language models, prompt design, RAG, and AI-powered features',              NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000059', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000012', 'Computer Vision',        'Image recognition, object detection, OCR, and video analysis with deep learning',                       NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000012', 'MLOps',                  'ML model deployment, monitoring, versioning, and continuous training pipelines',                         NOW(), NOW()),

  -- ── 13. Project Management (5 skills) ──
  ('ab000001-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000013', 'Project Planning & Scheduling', 'Work breakdown structures, Gantt charts, critical path analysis, and milestone tracking',          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000013', 'Risk Management',        'Risk identification, assessment, mitigation strategies, and risk registers',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000013', 'Stakeholder Management', 'Stakeholder analysis, communication planning, expectation management, and reporting',                   NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000013', 'Budget & Cost Management', 'Project budgeting, cost estimation, earned value management, and financial tracking',                 NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000013', 'Resource Allocation',    'Team capacity planning, resource leveling, and workload distribution',                                  NOW(), NOW()),

  -- ── 14. Agile & Scrum (5 skills) ──
  ('ab000001-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000014', 'Scrum Framework',        'Sprint planning, daily standups, retrospectives, backlog grooming, and Scrum events',                   NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000067', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000014', 'Kanban',                 'Kanban boards, WIP limits, flow metrics, and continuous delivery practices',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000068', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000014', 'User Story Writing',     'Writing effective user stories, acceptance criteria, story splitting, and estimation',                   NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000069', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000014', 'Sprint Velocity & Metrics', 'Tracking velocity, burn-down charts, cycle time, and continuous improvement metrics',                NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000014', 'SAFe (Scaled Agile)',    'Scaled Agile Framework for large enterprise programs, ARTs, and PI planning',                           NOW(), NOW()),

  -- ── 15. IT Service Management (5 skills) ──
  ('ab000001-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000015', 'ITIL Framework',         'ITIL v4 practices, service value system, and IT service management processes',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000015', 'Incident Management',    'Incident triage, escalation procedures, major incident handling, and post-mortems',                     NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000015', 'Change Management',      'Change advisory board processes, change requests, impact analysis, and rollback planning',              NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000074', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000015', 'Service Level Management', 'SLA definition, monitoring, reporting, and service level agreement compliance',                       NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000075', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000015', 'Service Desk Operations', 'Help desk management, ticket workflows, knowledge base curation, and first-call resolution',          NOW(), NOW()),

  -- ── 16. UI/UX Design (5 skills) ──
  ('ab000001-0000-0000-0000-000000000076', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000016', 'Figma',                  'UI design, prototyping, design systems, and collaborative design with Figma',                           NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000077', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000016', 'User Research',          'User interviews, surveys, personas, journey mapping, and usability testing',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000078', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000016', 'Design Systems',         'Building and maintaining component libraries, design tokens, and style guides',                         NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000079', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000016', 'Accessibility (WCAG)',   'Inclusive design, WCAG compliance, screen reader compatibility, and accessibility auditing',            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000080', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000016', 'Information Architecture', 'Content structuring, navigation design, sitemaps, and taxonomy development',                          NOW(), NOW()),

  -- ── 17. Monitoring & Observability (5 skills) ──
  ('ab000001-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000017', 'Prometheus & Grafana',   'Metrics collection with Prometheus, dashboard creation with Grafana, and alerting rules',               NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000017', 'ELK Stack',              'Centralized logging with Elasticsearch, Logstash, and Kibana for log analysis',                         NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000017', 'Distributed Tracing',    'Request tracing across microservices with Jaeger, Zipkin, or OpenTelemetry',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000084', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000017', 'Application Performance Monitoring', 'APM tools like Datadog, New Relic, or Azure Monitor for performance insights',                  NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000085', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000017', 'Incident Alerting & On-Call', 'Alert configuration, on-call rotation management, PagerDuty, and escalation policies',             NOW(), NOW()),

  -- ── 18. Networking & Systems (5 skills) ──
  ('ab000001-0000-0000-0000-000000000086', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000018', 'Linux System Administration', 'Linux server management, shell scripting, systemd, and OS hardening',                              NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000087', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000018', 'Windows Server Administration', 'Windows Server, Active Directory, Group Policy, and PowerShell automation',                       NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000088', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000018', 'Network Security',       'Firewalls, VPNs, network segmentation, IDS/IPS, and zero-trust networking',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000089', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000018', 'DNS & Load Balancing',   'DNS management, load balancer configuration, CDN setup, and traffic management',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000090', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000018', 'Virtualization',         'VMware, Hyper-V, and virtual machine management for development and production environments',           NOW(), NOW()),

  -- ── 19. Enterprise Application Management (5 skills) ──
  ('ab000001-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000019', 'ERP Administration',     'Enterprise resource planning system administration, configuration, and customization',                  NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000019', 'CRM Management',         'Customer relationship management system administration and workflow automation',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000019', 'Application Lifecycle Management', 'End-to-end application lifecycle from requirements through retirement',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000094', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000019', 'Legacy System Modernization', 'Strategies for migrating, refactoring, or replacing legacy applications',                          NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000095', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000019', 'Business Process Automation', 'Workflow automation, RPA, low-code/no-code platforms, and process optimization',                    NOW(), NOW()),

  -- ── 20. IT Governance & Strategy (5 skills) ──
  ('ab000001-0000-0000-0000-000000000096', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000020', 'COBIT Framework',        'IT governance using COBIT framework for enterprise IT management and alignment',                        NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000097', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000020', 'IT Portfolio Management', 'Application portfolio rationalization, investment analysis, and technology roadmapping',                NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000098', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000020', 'Technology Evaluation',  'Technology assessment, proof-of-concept development, and vendor evaluation',                            NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000020', 'IT Strategy & Roadmapping', 'Strategic IT planning, digital transformation roadmaps, and capability maturity models',             NOW(), NOW()),
  ('ab000001-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000020', 'Disaster Recovery & BCP', 'Business continuity planning, disaster recovery procedures, RTO/RPO targets, and failover testing',    NOW(), NOW());


-- +goose Down
DELETE FROM skills WHERE id IN (SELECT id FROM skills WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND id::text LIKE 'ab000001-0000-0000-0000-%');
DELETE FROM skill_categories WHERE id IN (SELECT id FROM skill_categories WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND id::text LIKE 'ca000001-0000-0000-0000-%');
