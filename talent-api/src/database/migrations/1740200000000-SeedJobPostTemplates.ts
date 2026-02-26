import { MigrationInterface, QueryRunner } from 'typeorm';
import { SeedUATData1708100000000 as S } from './1708100000000-SeedUATData';

/**
 * Seeds 50 comprehensive job post templates (25 per employer)
 * for Paystack and Flutterwave employer organizations.
 *
 * Covers: Engineering, Data & AI, Product & Design, Business & Operations,
 * Marketing & Growth, Sales & Support, Finance & HR, and Leadership roles.
 */
export class SeedJobPostTemplates1740200000000 implements MigrationInterface {
  name = 'SeedJobPostTemplates1740200000000';

  // Paystack templates: 99999999-0001-4000-a000-0000000000XX
  // Flutterwave templates: 99999999-0002-4000-a000-0000000000XX

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── PAYSTACK TEMPLATES (25) ────────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_post_templates (id, employer_id, name, template_data, created_at, updated_at, version)
      VALUES

      -- 1. Senior Backend Engineer
      ('99999999-0001-4000-a000-000000000001', '${S.ORG_PAYSTACK}',
       'Senior Backend Engineer',
       '${JSON.stringify({
         title: 'Senior Backend Engineer',
         description: 'We are looking for a Senior Backend Engineer to design and build the core payment processing systems that power commerce across Africa. You will work on high-throughput, low-latency services handling millions of daily transactions, collaborating closely with product, infrastructure, and security teams to deliver reliable, scalable solutions.',
         responsibilities: 'Architect and implement scalable RESTful and event-driven APIs for payment processing. Optimize database queries and data models for high-volume transaction workloads. Lead technical design reviews, code reviews, and mentor junior engineers. Drive observability improvements including logging, metrics, and distributed tracing. Collaborate with security and compliance teams to ensure PCI-DSS adherence.',
         skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'Message Queues'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 2. Frontend Engineer (React)
      ('99999999-0001-4000-a000-000000000002', '${S.ORG_PAYSTACK}',
       'Frontend Engineer (React)',
       '${JSON.stringify({
         title: 'Frontend Engineer (React)',
         description: 'Join our frontend team to build beautiful, performant interfaces for our merchant dashboard and developer tools. You will craft pixel-perfect UI components, optimize for performance across devices, and work with designers and product managers to deliver exceptional user experiences used by over 200,000 businesses.',
         responsibilities: 'Build and maintain reusable React components with TypeScript. Implement responsive, accessible interfaces following WCAG 2.1 guidelines. Write comprehensive unit and integration tests with Jest and React Testing Library. Optimize bundle sizes and rendering performance for users on low-bandwidth connections. Participate in design reviews and contribute to our internal component library.',
         skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Jest', 'Storybook'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 3. Full-Stack Developer
      ('99999999-0001-4000-a000-000000000003', '${S.ORG_PAYSTACK}',
       'Full-Stack Developer',
       '${JSON.stringify({
         title: 'Full-Stack Developer',
         description: 'We need a versatile Full-Stack Developer comfortable working across the entire stack — from database schema design to polished frontend interfaces. You will own features end-to-end, shipping solutions that impact merchants and their customers across the continent.',
         responsibilities: 'Develop full-stack features from database through API to UI. Write clean, well-tested code in TypeScript across Node.js and React. Design database schemas and write efficient queries. Participate in sprint planning, daily standups, and retrospectives. Troubleshoot production issues and contribute to incident postmortems.',
         skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST APIs', 'Git'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 4. Mobile Engineer (React Native)
      ('99999999-0001-4000-a000-000000000004', '${S.ORG_PAYSTACK}',
       'Mobile Engineer (React Native)',
       '${JSON.stringify({
         title: 'Mobile Engineer (React Native)',
         description: 'Build and maintain our cross-platform mobile applications that enable merchants to manage their businesses on the go. You will own the mobile experience from architecture decisions through deployment, shipping features used by thousands of merchants daily.',
         responsibilities: 'Develop and maintain React Native applications for iOS and Android. Implement native modules when cross-platform solutions are insufficient. Optimize app performance, startup time, and memory usage. Integrate with payment SDKs and device hardware (camera, NFC). Manage app store submissions and releases.',
         skills: ['React Native', 'TypeScript', 'iOS', 'Android', 'Redux', 'Jest'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 5. DevOps / Platform Engineer
      ('99999999-0001-4000-a000-000000000005', '${S.ORG_PAYSTACK}',
       'DevOps / Platform Engineer',
       '${JSON.stringify({
         title: 'DevOps / Platform Engineer',
         description: 'Join our platform engineering team to build and maintain the infrastructure that runs our payment systems. You will design CI/CD pipelines, manage cloud infrastructure, and ensure our services maintain 99.99% uptime across multiple regions.',
         responsibilities: 'Design and maintain CI/CD pipelines for automated testing and deployment. Manage cloud infrastructure on AWS/GCP using Infrastructure as Code (Terraform). Implement monitoring, alerting, and incident response automation. Optimize container orchestration with Kubernetes. Collaborate with security teams on infrastructure hardening and compliance.',
         skills: ['AWS', 'Terraform', 'Kubernetes', 'Docker', 'CI/CD', 'Linux', 'Prometheus'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 6. Site Reliability Engineer (SRE)
      ('99999999-0001-4000-a000-000000000006', '${S.ORG_PAYSTACK}',
       'Site Reliability Engineer (SRE)',
       '${JSON.stringify({
         title: 'Site Reliability Engineer (SRE)',
         description: 'Ensure the reliability and performance of our payment infrastructure serving millions of transactions daily. You will define and track SLOs, automate incident response, and build tools that make our engineering teams more productive and our services more resilient.',
         responsibilities: 'Define and monitor Service Level Objectives (SLOs) and error budgets. Build automated runbooks and self-healing infrastructure. Lead incident response, postmortems, and follow-up remediation. Conduct capacity planning and performance optimization. Develop internal tools for observability and deployment automation.',
         skills: ['Python', 'Go', 'Kubernetes', 'Prometheus', 'Grafana', 'PagerDuty', 'Terraform'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6500,
         salaryMax: 11000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 7. Data Engineer
      ('99999999-0001-4000-a000-000000000007', '${S.ORG_PAYSTACK}',
       'Data Engineer',
       '${JSON.stringify({
         title: 'Data Engineer',
         description: 'Design and build the data infrastructure that powers analytics, reporting, and machine learning across the organization. You will create robust data pipelines processing billions of payment events, making data accessible and reliable for data scientists, analysts, and product teams.',
         responsibilities: 'Design and build ETL/ELT pipelines for payment transaction data. Develop and maintain data warehouse schemas (star/snowflake). Create real-time streaming pipelines for event-driven analytics. Ensure data quality through validation, monitoring, and alerting. Optimize query performance and storage costs across the data platform.',
         skills: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'BigQuery', 'Kafka', 'dbt'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 5000,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 8. Data Scientist
      ('99999999-0001-4000-a000-000000000008', '${S.ORG_PAYSTACK}',
       'Data Scientist',
       '${JSON.stringify({
         title: 'Data Scientist',
         description: 'Apply statistical modeling and machine learning to solve critical business challenges in fraud detection, revenue optimization, and merchant insights. You will work with massive payment datasets to build models that directly impact millions of transactions and hundreds of thousands of merchants.',
         responsibilities: 'Build and deploy machine learning models for fraud detection and risk scoring. Conduct exploratory data analysis to identify business opportunities. Design A/B experiments and analyze results to guide product decisions. Create dashboards and reports for business stakeholders. Collaborate with engineering teams to productionize ML models.',
         skills: ['Python', 'SQL', 'scikit-learn', 'TensorFlow', 'Pandas', 'Jupyter', 'Statistics'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 5000,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 9. Machine Learning Engineer
      ('99999999-0001-4000-a000-000000000009', '${S.ORG_PAYSTACK}',
       'Machine Learning Engineer',
       '${JSON.stringify({
         title: 'Machine Learning Engineer',
         description: 'Bridge the gap between data science research and production systems. You will build the ML infrastructure and deploy models that power real-time fraud detection, intelligent routing, and personalized merchant experiences at scale.',
         responsibilities: 'Build and maintain ML training and serving infrastructure. Deploy models to production with low-latency inference requirements. Implement feature stores, model registries, and experiment tracking. Monitor model performance and implement automated retraining pipelines. Collaborate with data scientists to optimize model architectures for production.',
         skills: ['Python', 'TensorFlow', 'PyTorch', 'MLflow', 'Docker', 'Kubernetes', 'FastAPI'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 10. QA / Test Automation Engineer
      ('99999999-0001-4000-a000-000000000010', '${S.ORG_PAYSTACK}',
       'QA / Test Automation Engineer',
       '${JSON.stringify({
         title: 'QA / Test Automation Engineer',
         description: 'Ensure the quality and reliability of our payment platform through comprehensive testing strategies. You will design automated test suites, define quality processes, and work closely with development teams to catch issues before they reach production.',
         responsibilities: 'Design and implement automated test suites (unit, integration, E2E). Develop and maintain test frameworks and CI/CD quality gates. Perform manual exploratory testing for complex payment flows. Create and maintain test data management strategies. Define quality metrics and reporting dashboards for the engineering organization.',
         skills: ['Cypress', 'Jest', 'Playwright', 'TypeScript', 'Postman', 'CI/CD', 'SQL'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 11. Security Engineer
      ('99999999-0001-4000-a000-000000000011', '${S.ORG_PAYSTACK}',
       'Security Engineer',
       '${JSON.stringify({
         title: 'Security Engineer',
         description: 'Protect our payment infrastructure and merchant data as a Security Engineer. You will conduct security assessments, implement defensive measures, and ensure compliance with PCI-DSS and other financial industry standards across our platform.',
         responsibilities: 'Conduct security assessments, penetration testing, and code reviews. Implement and maintain security monitoring and incident response systems. Ensure PCI-DSS compliance across infrastructure and applications. Design and implement authentication, authorization, and encryption systems. Develop security awareness training and documentation for engineering teams.',
         skills: ['OWASP', 'PCI-DSS', 'Python', 'Penetration Testing', 'SIEM', 'Cloud Security', 'Cryptography'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 12. Product Manager
      ('99999999-0001-4000-a000-000000000012', '${S.ORG_PAYSTACK}',
       'Product Manager',
       '${JSON.stringify({
         title: 'Product Manager',
         description: 'Own the product roadmap for one of our core payment products. You will work at the intersection of business, technology, and user experience to define what we build, why we build it, and how we measure success — directly impacting hundreds of thousands of businesses across Africa.',
         responsibilities: 'Define product vision, strategy, and roadmap based on market research and user insights. Write detailed product requirements and user stories. Prioritize features using data-driven frameworks (RICE, ICE). Coordinate cross-functional teams (engineering, design, marketing) for successful launches. Analyze product metrics, run experiments, and iterate based on outcomes.',
         skills: ['Product Strategy', 'User Research', 'Data Analysis', 'Agile', 'SQL', 'Figma'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 13. Product Designer (UI/UX)
      ('99999999-0001-4000-a000-000000000013', '${S.ORG_PAYSTACK}',
       'Product Designer (UI/UX)',
       '${JSON.stringify({
         title: 'Product Designer (UI/UX)',
         description: 'Shape the user experience for products used by over 200,000 businesses and millions of their customers. You will lead the design process from research through final implementation, creating intuitive interfaces that make complex payment operations simple and delightful.',
         responsibilities: 'Conduct user research, usability testing, and competitive analysis. Create wireframes, prototypes, and high-fidelity designs in Figma. Design end-to-end user flows for complex payment and financial workflows. Maintain and evolve our design system and component library. Collaborate closely with engineers to ensure design fidelity in implementation.',
         skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Usability Testing', 'Interaction Design'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 14. UX Researcher
      ('99999999-0001-4000-a000-000000000014', '${S.ORG_PAYSTACK}',
       'UX Researcher',
       '${JSON.stringify({
         title: 'UX Researcher',
         description: 'Uncover deep insights about our merchants and their customers to inform product decisions. You will plan and execute research studies, synthesize findings into actionable recommendations, and build a culture of user-centered design across the organization.',
         responsibilities: 'Plan and conduct qualitative and quantitative user research studies. Recruit research participants across diverse merchant segments and geographies. Synthesize findings into personas, journey maps, and actionable insights. Present research findings to stakeholders and influence product strategy. Build and maintain a research repository for cross-team knowledge sharing.',
         skills: ['User Interviews', 'Survey Design', 'Usability Testing', 'Data Analysis', 'Figma', 'Miro'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 15. Technical Program Manager
      ('99999999-0001-4000-a000-000000000015', '${S.ORG_PAYSTACK}',
       'Technical Program Manager',
       '${JSON.stringify({
         title: 'Technical Program Manager',
         description: 'Drive execution of complex, cross-team technical initiatives. You will coordinate engineering teams, manage dependencies, and ensure that major platform investments are delivered on time and with high quality across our payments infrastructure.',
         responsibilities: 'Manage complex, cross-functional technical programs from inception to delivery. Create and maintain project plans, timelines, and risk registries. Facilitate technical decision-making and resolve cross-team dependencies. Run program reviews, status updates, and executive reporting. Drive process improvements in software delivery and release management.',
         skills: ['Program Management', 'Agile', 'JIRA', 'Risk Management', 'Stakeholder Management', 'Technical Architecture'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 16. Developer Relations Engineer
      ('99999999-0001-4000-a000-000000000016', '${S.ORG_PAYSTACK}',
       'Developer Relations Engineer',
       '${JSON.stringify({
         title: 'Developer Relations Engineer',
         description: 'Be the bridge between our engineering team and the developer community. You will create technical content, build sample applications, speak at events, and ensure that developers have an exceptional experience integrating our payment APIs.',
         responsibilities: 'Create technical tutorials, blog posts, and API documentation. Build sample applications and SDKs in multiple programming languages. Speak at developer conferences, meetups, and webinars. Gather developer feedback and advocate for API improvements. Manage developer community forums and support channels.',
         skills: ['Technical Writing', 'JavaScript', 'Python', 'API Design', 'Public Speaking', 'Community Building'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 17. Technical Writer
      ('99999999-0001-4000-a000-000000000017', '${S.ORG_PAYSTACK}',
       'Technical Writer',
       '${JSON.stringify({
         title: 'Technical Writer',
         description: 'Create clear, accurate, and comprehensive documentation for our payment APIs and developer tools. You will work closely with engineering teams to translate complex technical concepts into documentation that enables developers to integrate our products quickly and confidently.',
         responsibilities: 'Write and maintain API reference documentation and developer guides. Create getting-started tutorials, integration guides, and migration documentation. Develop and enforce documentation style guides and standards. Review API designs and provide feedback on developer experience. Manage documentation tooling, versioning, and publishing workflows.',
         skills: ['Technical Writing', 'API Documentation', 'Markdown', 'Git', 'OpenAPI/Swagger', 'Developer Tools'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 18. Growth Marketing Manager
      ('99999999-0001-4000-a000-000000000018', '${S.ORG_PAYSTACK}',
       'Growth Marketing Manager',
       '${JSON.stringify({
         title: 'Growth Marketing Manager',
         description: 'Drive merchant acquisition and activation across African markets. You will develop and execute growth strategies, optimize conversion funnels, and use data to identify the highest-impact opportunities for expanding our merchant base.',
         responsibilities: 'Develop and execute multi-channel growth marketing strategies. Optimize merchant sign-up and activation funnels through experimentation. Manage paid acquisition campaigns across Google, Meta, and LinkedIn. Analyze marketing metrics and build attribution models. Collaborate with product teams on growth features and referral programs.',
         skills: ['Digital Marketing', 'Google Analytics', 'SEO/SEM', 'A/B Testing', 'SQL', 'HubSpot'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 19. Content Marketing Specialist
      ('99999999-0001-4000-a000-000000000019', '${S.ORG_PAYSTACK}',
       'Content Marketing Specialist',
       '${JSON.stringify({
         title: 'Content Marketing Specialist',
         description: 'Tell the story of African commerce through compelling content. You will create blog posts, case studies, whitepapers, and social media content that educates merchants, attracts developers, and positions us as the leading payment platform in Africa.',
         responsibilities: 'Create engaging blog posts, case studies, and thought leadership content. Develop content calendars aligned with product launches and campaigns. Write email marketing sequences for merchant onboarding and engagement. Manage social media content strategy across platforms. Collaborate with PR team on press releases and media outreach.',
         skills: ['Content Writing', 'SEO', 'Social Media', 'Email Marketing', 'WordPress', 'Analytics'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'entry',
         salaryMin: 2500,
         salaryMax: 5000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 20. Customer Success Manager
      ('99999999-0001-4000-a000-000000000020', '${S.ORG_PAYSTACK}',
       'Customer Success Manager',
       '${JSON.stringify({
         title: 'Customer Success Manager',
         description: 'Ensure our enterprise merchants get maximum value from our payment platform. You will be the primary point of contact for key accounts, driving adoption, resolving escalations, and identifying upselling opportunities that help merchants grow.',
         responsibilities: 'Manage a portfolio of enterprise merchant accounts. Conduct regular business reviews and health checks. Drive product adoption and identify expansion opportunities. Coordinate with engineering and product teams on merchant feedback. Develop success playbooks and onboarding guides for new merchants.',
         skills: ['Account Management', 'Customer Success', 'CRM (Salesforce)', 'Data Analysis', 'Presentation Skills', 'Payments Industry'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 21. Solutions Engineer
      ('99999999-0001-4000-a000-000000000021', '${S.ORG_PAYSTACK}',
       'Solutions Engineer',
       '${JSON.stringify({
         title: 'Solutions Engineer',
         description: 'Help enterprise merchants design and implement custom payment solutions. You will combine deep technical knowledge with business acumen to architect integrations, troubleshoot complex issues, and ensure merchants can leverage our full platform capabilities.',
         responsibilities: 'Design custom payment integration architectures for enterprise merchants. Provide technical guidance during sales cycles and POC implementations. Create technical proposals, architecture diagrams, and integration plans. Troubleshoot complex API integration issues across multiple environments. Build reusable integration templates and best practices documentation.',
         skills: ['API Integration', 'JavaScript', 'Python', 'SQL', 'REST APIs', 'Webhooks', 'Payment Systems'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 22. Financial Analyst
      ('99999999-0001-4000-a000-000000000022', '${S.ORG_PAYSTACK}',
       'Financial Analyst',
       '${JSON.stringify({
         title: 'Financial Analyst',
         description: 'Support strategic financial decision-making as we scale across African markets. You will build financial models, analyze transaction economics, and provide insights that inform pricing, investments, and operational efficiency initiatives.',
         responsibilities: 'Build financial models for revenue forecasting and scenario analysis. Analyze transaction data to optimize pricing and fee structures. Prepare monthly financial reports and variance analysis. Support fundraising activities with investor materials and financial projections. Partner with product and operations teams on business case development.',
         skills: ['Financial Modeling', 'Excel', 'SQL', 'Data Analysis', 'PowerPoint', 'Accounting'],
         jobType: 'full_time',
         workMode: 'on_site',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 23. People Operations Manager
      ('99999999-0001-4000-a000-000000000023', '${S.ORG_PAYSTACK}',
       'People Operations Manager',
       '${JSON.stringify({
         title: 'People Operations Manager',
         description: 'Build and scale people programs that attract, develop, and retain world-class talent. You will own the employee lifecycle from onboarding to offboarding, design performance management processes, and foster a culture that makes our team their best work.',
         responsibilities: 'Design and implement people programs (onboarding, performance reviews, engagement). Manage HR operations including benefits, payroll coordination, and compliance. Develop talent development and career progression frameworks. Analyze people metrics (retention, engagement, DEI) and recommend improvements. Partner with managers on team effectiveness, conflict resolution, and organizational design.',
         skills: ['HR Management', 'People Analytics', 'Employment Law', 'HRIS Systems', 'Employee Engagement', 'Organizational Design'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 4500,
         salaryMax: 7500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 24. Compliance Officer
      ('99999999-0001-4000-a000-000000000024', '${S.ORG_PAYSTACK}',
       'Compliance Officer',
       '${JSON.stringify({
         title: 'Compliance Officer',
         description: 'Ensure our payment operations comply with financial regulations across every market we serve. You will navigate the complex regulatory landscape of African fintech, managing licensing requirements, KYC/AML programs, and relationships with financial regulators.',
         responsibilities: 'Maintain compliance with CBN, PCI-DSS, and other regulatory frameworks. Manage KYC/AML programs including merchant onboarding verification. Conduct regular compliance audits and risk assessments. Prepare regulatory filings, reports, and license applications. Stay current on evolving fintech regulations across African markets.',
         skills: ['Regulatory Compliance', 'AML/KYC', 'PCI-DSS', 'Risk Assessment', 'Financial Regulations', 'Audit'],
         jobType: 'full_time',
         workMode: 'on_site',
         experienceLevel: 'senior',
         salaryMin: 5000,
         salaryMax: 8500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 25. Engineering Manager
      ('99999999-0001-4000-a000-000000000025', '${S.ORG_PAYSTACK}',
       'Engineering Manager',
       '${JSON.stringify({
         title: 'Engineering Manager',
         description: 'Lead a team of talented engineers building Africa\'s payment infrastructure. You will combine technical leadership with people management to grow your team, ship high-quality products, and foster a culture of engineering excellence.',
         responsibilities: 'Manage, mentor, and grow a team of 6-10 engineers. Set technical direction and architectural standards for your domain. Drive sprint planning, delivery execution, and continuous improvement. Conduct regular 1:1s, performance reviews, and career development conversations. Collaborate with product managers and designers on roadmap prioritization.',
         skills: ['Engineering Leadership', 'Agile/Scrum', 'System Design', 'People Management', 'Technical Strategy', 'Hiring'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 7000,
         salaryMax: 12000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1)

      ON CONFLICT DO NOTHING;
    `);

    // ─── FLUTTERWAVE TEMPLATES (25) ─────────────────────────────
    await queryRunner.query(`
      INSERT INTO job_post_templates (id, employer_id, name, template_data, created_at, updated_at, version)
      VALUES

      -- 1. Backend Engineer (Go)
      ('99999999-0002-4000-a000-000000000001', '${S.ORG_FLUTTERWAVE}',
       'Backend Engineer (Go)',
       '${JSON.stringify({
         title: 'Backend Engineer (Go)',
         description: 'Build high-performance payment services in Go that process billions of naira in transactions. You will design microservices, implement payment protocols, and ensure our backend systems can scale to meet the growing demand for digital payments across Africa.',
         responsibilities: 'Develop high-performance microservices in Go for payment processing. Design and implement RESTful and gRPC APIs. Optimize database queries and implement caching strategies. Write comprehensive unit and integration tests. Participate in architecture reviews and technical decision-making.',
         skills: ['Go', 'PostgreSQL', 'Redis', 'gRPC', 'Docker', 'Microservices'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 5000,
         salaryMax: 8500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 2. Frontend Engineer (Vue.js)
      ('99999999-0002-4000-a000-000000000002', '${S.ORG_FLUTTERWAVE}',
       'Frontend Engineer (Vue.js)',
       '${JSON.stringify({
         title: 'Frontend Engineer (Vue.js)',
         description: 'Create the next generation of our merchant dashboard and payment interfaces using Vue.js. You will build interactive, real-time financial dashboards that help businesses track payments, manage settlements, and analyze their revenue across multiple channels.',
         responsibilities: 'Build interactive merchant dashboard features using Vue.js and Nuxt. Implement real-time payment tracking and data visualization. Develop reusable component libraries with comprehensive documentation. Ensure cross-browser compatibility and responsive design. Write unit and E2E tests with Vitest and Cypress.',
         skills: ['Vue.js', 'Nuxt', 'TypeScript', 'Tailwind CSS', 'Vitest', 'Pinia'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 3. Mobile Engineer (Flutter)
      ('99999999-0002-4000-a000-000000000003', '${S.ORG_FLUTTERWAVE}',
       'Mobile Engineer (Flutter)',
       '${JSON.stringify({
         title: 'Mobile Engineer (Flutter)',
         description: 'Build beautiful, cross-platform mobile applications with Flutter for our merchant and consumer products. You will ship features that help businesses accept payments, manage transactions, and access financial services from their mobile devices.',
         responsibilities: 'Develop and maintain Flutter applications for iOS and Android. Implement platform-specific features using method channels and plugins. Optimize app performance, animations, and offline capabilities. Integrate with payment SDKs and biometric authentication. Manage app releases and monitor crash analytics.',
         skills: ['Flutter', 'Dart', 'iOS', 'Android', 'REST APIs', 'Firebase'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 7500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 4. Cloud Infrastructure Engineer
      ('99999999-0002-4000-a000-000000000004', '${S.ORG_FLUTTERWAVE}',
       'Cloud Infrastructure Engineer',
       '${JSON.stringify({
         title: 'Cloud Infrastructure Engineer',
         description: 'Design and manage the cloud infrastructure that powers payments across 34+ African countries. You will architect multi-region deployments, optimize costs, and ensure our platform can handle peak transaction volumes with minimal latency.',
         responsibilities: 'Design and maintain multi-region cloud infrastructure on AWS. Implement Infrastructure as Code using Terraform and CloudFormation. Build and optimize container orchestration with ECS/EKS. Manage networking, VPCs, load balancers, and CDN configurations. Implement disaster recovery plans and conduct regular failover drills.',
         skills: ['AWS', 'Terraform', 'Docker', 'ECS/EKS', 'CloudFormation', 'Linux', 'Networking'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 5. Software Engineer (Python)
      ('99999999-0002-4000-a000-000000000005', '${S.ORG_FLUTTERWAVE}',
       'Software Engineer (Python)',
       '${JSON.stringify({
         title: 'Software Engineer (Python)',
         description: 'Build robust backend services and automation tools in Python. You will work on payment reconciliation systems, internal tooling, and integration services that keep our payment operations running smoothly across multiple corridors and currencies.',
         responsibilities: 'Develop backend services and APIs using Python (FastAPI/Django). Build payment reconciliation and settlement automation systems. Create internal tools for operations and compliance teams. Write comprehensive tests and maintain high code coverage. Design and optimize database schemas and queries.',
         skills: ['Python', 'FastAPI', 'Django', 'PostgreSQL', 'Celery', 'Redis', 'Docker'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 6. Blockchain / Web3 Developer
      ('99999999-0002-4000-a000-000000000006', '${S.ORG_FLUTTERWAVE}',
       'Blockchain / Web3 Developer',
       '${JSON.stringify({
         title: 'Blockchain / Web3 Developer',
         description: 'Explore and build blockchain-based payment solutions that expand financial access in Africa. You will develop smart contracts, integrate with multiple blockchain networks, and help us leverage Web3 technologies to offer new payment corridors and settlement options.',
         responsibilities: 'Develop and audit smart contracts for payment settlement and escrow. Integrate with multiple blockchain networks (Ethereum, Solana, Stellar). Build blockchain indexing and monitoring infrastructure. Implement cryptocurrency payment processing and conversion flows. Research emerging Web3 technologies and their applicability to African payments.',
         skills: ['Solidity', 'Web3.js', 'Ethereum', 'Rust', 'Smart Contracts', 'Node.js', 'Cryptography'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 7000,
         salaryMax: 12000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 7. Database Administrator
      ('99999999-0002-4000-a000-000000000007', '${S.ORG_FLUTTERWAVE}',
       'Database Administrator',
       '${JSON.stringify({
         title: 'Database Administrator',
         description: 'Manage and optimize the databases that store billions of payment records. You will ensure data integrity, optimize performance, plan capacity, and implement backup and recovery strategies for our mission-critical financial data.',
         responsibilities: 'Manage PostgreSQL and MySQL database clusters in production. Optimize query performance and design efficient indexing strategies. Implement backup, replication, and disaster recovery procedures. Monitor database health, capacity, and resource utilization. Plan and execute database migrations and version upgrades with zero downtime.',
         skills: ['PostgreSQL', 'MySQL', 'Database Optimization', 'Replication', 'Backup/Recovery', 'Linux', 'Monitoring'],
         jobType: 'full_time',
         workMode: 'on_site',
         experienceLevel: 'senior',
         salaryMin: 5000,
         salaryMax: 8500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 8. Data Analyst
      ('99999999-0002-4000-a000-000000000008', '${S.ORG_FLUTTERWAVE}',
       'Data Analyst',
       '${JSON.stringify({
         title: 'Data Analyst',
         description: 'Turn payment data into actionable business insights. You will analyze transaction patterns, build reports and dashboards, and help leadership make data-driven decisions about market expansion, product features, and operational efficiency.',
         responsibilities: 'Build interactive dashboards and reports for business stakeholders. Analyze transaction data to identify trends, anomalies, and opportunities. Develop KPI tracking frameworks for product and operations teams. Create automated reporting pipelines for regular business reviews. Present data-driven insights and recommendations to leadership.',
         skills: ['SQL', 'Python', 'Tableau', 'Excel', 'Statistics', 'Data Visualization'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'entry',
         salaryMin: 2500,
         salaryMax: 5000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 9. Business Intelligence Analyst
      ('99999999-0002-4000-a000-000000000009', '${S.ORG_FLUTTERWAVE}',
       'Business Intelligence Analyst',
       '${JSON.stringify({
         title: 'Business Intelligence Analyst',
         description: 'Build the BI infrastructure that powers strategic decision-making across the organization. You will design data models, create self-service analytics tools, and develop forecasting models that help us understand and grow our business across African markets.',
         responsibilities: 'Design and maintain BI data models and semantic layers. Build self-service dashboards and reporting tools for business users. Develop revenue forecasting and market sizing models. Automate data quality checks and anomaly detection. Partner with engineering to improve data warehouse design and performance.',
         skills: ['SQL', 'Looker', 'dbt', 'Python', 'BigQuery', 'Data Modeling', 'Business Analytics'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 10. AI / ML Research Scientist
      ('99999999-0002-4000-a000-000000000010', '${S.ORG_FLUTTERWAVE}',
       'AI / ML Research Scientist',
       '${JSON.stringify({
         title: 'AI / ML Research Scientist',
         description: 'Push the boundaries of applied AI/ML in African payments. You will research and develop novel machine learning approaches for fraud detection, credit scoring, and intelligent payment routing that work effectively across diverse African markets and data conditions.',
         responsibilities: 'Research and prototype novel ML approaches for fraud detection and risk scoring. Develop credit scoring models for emerging market conditions. Publish research papers and contribute to the broader ML community. Design experiments to validate model performance across diverse data populations. Collaborate with engineering teams to deploy research models to production.',
         skills: ['Python', 'PyTorch', 'TensorFlow', 'NLP', 'Computer Vision', 'Statistics', 'Research'],
         jobType: 'full_time',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 7000,
         salaryMax: 12000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria (Remote-friendly)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 11. Technical Product Manager
      ('99999999-0002-4000-a000-000000000011', '${S.ORG_FLUTTERWAVE}',
       'Technical Product Manager',
       '${JSON.stringify({
         title: 'Technical Product Manager',
         description: 'Own the technical product roadmap for our payment APIs and developer platform. You will combine deep technical understanding with product thinking to define how developers integrate payments, design API contracts, and ensure our platform provides the best developer experience in African fintech.',
         responsibilities: 'Define technical product requirements for API features and developer tools. Design API contracts and integration patterns in collaboration with engineering. Analyze API usage metrics and developer feedback to guide product decisions. Manage the developer documentation roadmap and changelog. Coordinate technical partnerships and third-party integrations.',
         skills: ['API Design', 'Product Management', 'REST APIs', 'Developer Experience', 'Agile', 'SQL'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 12. Visual / Brand Designer
      ('99999999-0002-4000-a000-000000000012', '${S.ORG_FLUTTERWAVE}',
       'Visual / Brand Designer',
       '${JSON.stringify({
         title: 'Visual / Brand Designer',
         description: 'Shape the visual identity that represents payments across Africa. You will create stunning brand assets, marketing materials, and visual campaigns that communicate trust, innovation, and accessibility to businesses and consumers across diverse African markets.',
         responsibilities: 'Create brand assets including illustrations, icons, and marketing graphics. Design campaigns for social media, events, and product launches. Maintain and evolve brand guidelines and visual identity systems. Produce print and digital materials for regional marketing campaigns. Collaborate with the marketing and product teams on visual storytelling.',
         skills: ['Adobe Creative Suite', 'Figma', 'Illustration', 'Brand Design', 'Typography', 'Motion Graphics'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3000,
         salaryMax: 6000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 13. Scrum Master / Agile Coach
      ('99999999-0002-4000-a000-000000000013', '${S.ORG_FLUTTERWAVE}',
       'Scrum Master / Agile Coach',
       '${JSON.stringify({
         title: 'Scrum Master / Agile Coach',
         description: 'Help our engineering teams deliver their best work through effective agile practices. You will coach teams on Scrum and Kanban methodologies, facilitate ceremonies, remove impediments, and continuously improve how we build and ship payment products.',
         responsibilities: 'Facilitate Scrum ceremonies (standups, sprint planning, retrospectives). Coach teams on agile principles, Scrum, and Kanban practices. Identify and remove impediments to team productivity. Track and report on team velocity, burndown, and delivery metrics. Drive continuous improvement initiatives across engineering teams.',
         skills: ['Scrum', 'Kanban', 'JIRA', 'Coaching', 'Facilitation', 'Conflict Resolution'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 14. Solutions Architect
      ('99999999-0002-4000-a000-000000000014', '${S.ORG_FLUTTERWAVE}',
       'Solutions Architect',
       '${JSON.stringify({
         title: 'Solutions Architect',
         description: 'Design end-to-end payment solutions for our largest enterprise clients and strategic partners. You will architect complex integrations spanning multiple payment channels, currencies, and regulatory environments across 34+ African countries.',
         responsibilities: 'Design scalable payment integration architectures for enterprise clients. Create technical architecture documents, sequence diagrams, and integration blueprints. Lead technical discovery workshops with client engineering teams. Define best practices for high-availability payment system design. Evaluate emerging technologies and recommend platform improvements.',
         skills: ['System Design', 'Cloud Architecture', 'API Design', 'Payment Systems', 'AWS/GCP', 'UML/Diagrams'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 6500,
         salaryMax: 11000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 15. Community Manager
      ('99999999-0002-4000-a000-000000000015', '${S.ORG_FLUTTERWAVE}',
       'Community Manager',
       '${JSON.stringify({
         title: 'Community Manager',
         description: 'Build and nurture a thriving community of developers and merchants who use our payment platform. You will create engagement programs, manage online communities, and organize events that foster connections and drive platform adoption.',
         responsibilities: 'Manage developer and merchant community channels (Discord, Slack, forums). Plan and execute community events, hackathons, and meetups. Create community newsletters and engagement campaigns. Monitor community sentiment and escalate product feedback. Develop community ambassador and advocacy programs.',
         skills: ['Community Management', 'Social Media', 'Event Planning', 'Content Creation', 'Communication', 'Analytics'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'entry',
         salaryMin: 2000,
         salaryMax: 4500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 16. Digital Marketing Manager
      ('99999999-0002-4000-a000-000000000016', '${S.ORG_FLUTTERWAVE}',
       'Digital Marketing Manager',
       '${JSON.stringify({
         title: 'Digital Marketing Manager',
         description: 'Lead our digital marketing efforts across Africa. You will develop comprehensive digital strategies, manage multi-channel campaigns, and drive merchant acquisition through SEO, paid advertising, email marketing, and social media across diverse African markets.',
         responsibilities: 'Develop and execute digital marketing strategies across multiple channels. Manage paid advertising budgets on Google Ads, Meta, and LinkedIn. Optimize SEO performance and organic traffic growth. Create marketing automation workflows for lead nurturing. Analyze campaign performance and optimize for ROI.',
         skills: ['Digital Marketing', 'Google Ads', 'Meta Ads', 'SEO', 'Email Marketing', 'Google Analytics', 'Marketing Automation'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 17. Account Executive
      ('99999999-0002-4000-a000-000000000017', '${S.ORG_FLUTTERWAVE}',
       'Account Executive',
       '${JSON.stringify({
         title: 'Account Executive',
         description: 'Drive revenue growth by selling our payment solutions to businesses across Africa. You will manage the full sales cycle from prospecting to close, building relationships with decision-makers and demonstrating how our platform can transform their payment operations.',
         responsibilities: 'Manage full sales cycle from lead generation to contract closing. Build and maintain a qualified pipeline of enterprise prospects. Conduct product demos and presentations to C-level stakeholders. Negotiate contracts and pricing aligned with company guidelines. Collaborate with solutions engineering on technical requirements.',
         skills: ['B2B Sales', 'CRM (Salesforce)', 'Negotiation', 'Pipeline Management', 'Presentation Skills', 'FinTech'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 7000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 18. Sales Development Representative
      ('99999999-0002-4000-a000-000000000018', '${S.ORG_FLUTTERWAVE}',
       'Sales Development Representative',
       '${JSON.stringify({
         title: 'Sales Development Representative',
         description: 'Be the first point of contact for prospective merchants looking for payment solutions. You will qualify inbound leads, conduct outbound prospecting, and book meetings that feed the sales pipeline — helping us connect with the next generation of African businesses.',
         responsibilities: 'Qualify inbound leads and schedule discovery calls with account executives. Conduct outbound prospecting via email, phone, and LinkedIn. Research target companies and personalize outreach messaging. Meet and exceed monthly meeting booking and pipeline contribution targets. Maintain accurate records and activity tracking in CRM.',
         skills: ['Outbound Sales', 'Cold Calling', 'Email Outreach', 'CRM', 'LinkedIn Sales Navigator', 'Communication'],
         jobType: 'full_time',
         workMode: 'on_site',
         experienceLevel: 'entry',
         salaryMin: 1500,
         salaryMax: 3500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 19. Technical Support Engineer
      ('99999999-0002-4000-a000-000000000019', '${S.ORG_FLUTTERWAVE}',
       'Technical Support Engineer',
       '${JSON.stringify({
         title: 'Technical Support Engineer',
         description: 'Provide world-class technical support to developers integrating our payment APIs. You will troubleshoot complex integration issues, create support documentation, and serve as the voice of the developer community within our engineering organization.',
         responsibilities: 'Troubleshoot and resolve complex API integration issues for merchants. Create and maintain technical support knowledge base articles. Escalate bugs and feature requests to engineering teams with detailed reproduction steps. Monitor API health dashboards and proactively communicate outages. Conduct root cause analysis on recurring support issues.',
         skills: ['REST APIs', 'JavaScript', 'Debugging', 'Customer Support', 'SQL', 'Postman', 'Technical Writing'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'entry',
         salaryMin: 2000,
         salaryMax: 4000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 20. Talent Acquisition Specialist
      ('99999999-0002-4000-a000-000000000020', '${S.ORG_FLUTTERWAVE}',
       'Talent Acquisition Specialist',
       '${JSON.stringify({
         title: 'Talent Acquisition Specialist',
         description: 'Help us find and attract the best talent in African tech. You will manage the full recruitment lifecycle, build talent pipelines, and create exceptional candidate experiences that reflect our brand and culture.',
         responsibilities: 'Manage end-to-end recruitment for engineering and business roles. Source candidates through LinkedIn, job boards, and networking events. Screen applications, conduct initial interviews, and coordinate hiring panels. Build and maintain talent pipelines for key recurring roles. Analyze recruitment metrics and optimize hiring processes.',
         skills: ['Recruiting', 'LinkedIn Recruiter', 'ATS Systems', 'Interviewing', 'Employer Branding', 'Sourcing'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3000,
         salaryMax: 5500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 21. Embedded Systems Engineer
      ('99999999-0002-4000-a000-000000000021', '${S.ORG_FLUTTERWAVE}',
       'Embedded Systems Engineer',
       '${JSON.stringify({
         title: 'Embedded Systems Engineer',
         description: 'Develop firmware and software for our POS terminals and payment hardware devices. You will work on the intersection of hardware and software, building reliable payment solutions that work across diverse network conditions and power environments in Africa.',
         responsibilities: 'Develop firmware for POS terminals and payment card readers. Implement payment protocols (EMV, NFC, QR) on embedded devices. Optimize for low power consumption and intermittent connectivity. Write hardware abstraction layers and device drivers. Conduct hardware testing, certification, and integration with backend systems.',
         skills: ['C/C++', 'Embedded Linux', 'RTOS', 'EMV', 'NFC', 'Hardware Integration', 'IoT'],
         jobType: 'full_time',
         workMode: 'on_site',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 22. Staff Engineer
      ('99999999-0002-4000-a000-000000000022', '${S.ORG_FLUTTERWAVE}',
       'Staff Engineer',
       '${JSON.stringify({
         title: 'Staff Engineer',
         description: 'Drive technical excellence as a Staff Engineer. You will set architectural direction across multiple teams, solve the hardest technical problems, and raise the bar for engineering quality across the organization while serving as a technical role model and mentor.',
         responsibilities: 'Set technical direction and architectural standards across multiple teams. Lead design and implementation of complex cross-cutting systems. Mentor senior engineers and conduct architectural reviews. Define engineering best practices, coding standards, and technical governance. Collaborate with engineering leadership on technology strategy and roadmap.',
         skills: ['System Design', 'Distributed Systems', 'Technical Leadership', 'Architecture', 'Mentoring', 'Multiple Languages'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 8000,
         salaryMax: 14000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 23. VP of Engineering
      ('99999999-0002-4000-a000-000000000023', '${S.ORG_FLUTTERWAVE}',
       'VP of Engineering',
       '${JSON.stringify({
         title: 'VP of Engineering',
         description: 'Lead the engineering organization as we scale to process payments across all of Africa. You will build and manage engineering leadership, define technical strategy, drive organizational excellence, and ensure we attract and retain world-class engineering talent.',
         responsibilities: 'Build and lead the engineering management team across multiple domains. Define engineering strategy, OKRs, and organizational structure. Own engineering hiring, retention, and career development programs. Drive engineering culture, processes, and technical excellence standards. Partner with executive team on company strategy and technology investment decisions.',
         skills: ['Engineering Leadership', 'Organizational Design', 'Strategic Planning', 'Executive Communication', 'Talent Development', 'FinTech'],
         jobType: 'full_time',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 12000,
         salaryMax: 20000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 24. Payroll Administrator
      ('99999999-0002-4000-a000-000000000024', '${S.ORG_FLUTTERWAVE}',
       'Payroll Administrator',
       '${JSON.stringify({
         title: 'Payroll Administrator',
         description: 'Manage payroll operations across our offices in multiple African countries. You will ensure accurate and timely salary payments, maintain compliance with local tax regulations, and administer employee benefits across diverse regulatory environments.',
         responsibilities: 'Process monthly payroll for employees across multiple countries. Ensure compliance with local tax, pension, and labor regulations. Manage benefits administration including health insurance and leave tracking. Reconcile payroll accounts and prepare financial reports. Coordinate with finance on payroll budgeting and forecasting.',
         skills: ['Payroll Processing', 'Tax Compliance', 'HRIS', 'Excel', 'Benefits Administration', 'Multi-country Payroll'],
         jobType: 'full_time',
         workMode: 'on_site',
         experienceLevel: 'mid',
         salaryMin: 2500,
         salaryMax: 5000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- 25. Internship - Software Engineering
      ('99999999-0002-4000-a000-000000000025', '${S.ORG_FLUTTERWAVE}',
       'Internship - Software Engineering',
       '${JSON.stringify({
         title: 'Software Engineering Intern',
         description: 'Launch your career in fintech with our 3-6 month internship program. You will work alongside experienced engineers on real product features, participate in code reviews and team ceremonies, and gain hands-on experience building payment systems that serve millions of users.',
         responsibilities: 'Contribute to production codebase under mentorship from senior engineers. Participate in sprint ceremonies, code reviews, and team discussions. Build and ship at least one feature or improvement during the internship. Write unit tests and documentation for assigned projects. Present internship learnings and project outcomes to the team.',
         skills: ['JavaScript', 'Python', 'Git', 'REST APIs', 'Problem Solving', 'Communication'],
         jobType: 'internship',
         workMode: 'on_site',
         experienceLevel: 'entry',
         salaryMin: 1000,
         salaryMax: 2000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1)

      ON CONFLICT DO NOTHING;
    `);

    // ─── CONTRACT TEMPLATES — PAYSTACK (10) ─────────────────────
    await queryRunner.query(`
      INSERT INTO job_post_templates (id, employer_id, name, template_data, created_at, updated_at, version)
      VALUES

      -- C1. Contract Backend Developer (Node.js)
      ('99999999-0003-4000-a000-000000000001', '${S.ORG_PAYSTACK}',
       'Contract: Backend Developer (Node.js) — 6 Months',
       '${JSON.stringify({
         title: 'Contract Backend Developer (Node.js)',
         description: 'We are hiring a contract Backend Developer to augment our payments team for a 6-month engagement. You will build and ship API features, contribute to our microservices architecture, and help us hit critical delivery milestones for upcoming product launches.',
         responsibilities: 'Develop and ship new API endpoints and microservice features in Node.js/TypeScript. Write unit and integration tests to maintain high code coverage standards. Participate in code reviews, sprint ceremonies, and technical discussions. Troubleshoot and fix bugs in production services. Document technical decisions and API contracts for handover.',
         skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs', 'Docker', 'Jest'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 4000,
         salaryMax: 7000,
         salaryCurrency: 'USD',
         location: 'Remote (Africa timezone preferred)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C2. Contract Frontend Developer (React)
      ('99999999-0003-4000-a000-000000000002', '${S.ORG_PAYSTACK}',
       'Contract: Frontend Developer (React) — 3 Months',
       '${JSON.stringify({
         title: 'Contract Frontend Developer (React)',
         description: 'Join us for a 3-month contract to help redesign and rebuild key sections of our merchant dashboard. You will work closely with our design team to implement new UI components, improve performance, and deliver a polished user experience.',
         responsibilities: 'Implement new dashboard pages and interactive components in React/TypeScript. Translate Figma designs into pixel-perfect, responsive interfaces. Optimize rendering performance and reduce bundle sizes. Write Storybook stories and unit tests for all new components. Ensure WCAG 2.1 AA accessibility compliance across all deliverables.',
         skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Storybook', 'Jest'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Remote (Africa timezone preferred)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C3. Contract Data Migration Specialist
      ('99999999-0003-4000-a000-000000000003', '${S.ORG_PAYSTACK}',
       'Contract: Data Migration Specialist — 3 Months',
       '${JSON.stringify({
         title: 'Contract Data Migration Specialist',
         description: 'Lead a critical 3-month data migration project as we consolidate legacy payment databases into our new unified data platform. You will design migration strategies, build ETL pipelines, validate data integrity, and ensure zero data loss during the transition.',
         responsibilities: 'Design and execute data migration plans for legacy payment databases. Build ETL pipelines to transform and load data into the new platform. Implement data validation and reconciliation checks at every stage. Create rollback procedures and disaster recovery plans for each migration phase. Document migration runbooks and train internal teams on the new data architecture.',
         skills: ['SQL', 'Python', 'ETL', 'PostgreSQL', 'Data Validation', 'Shell Scripting'],
         jobType: 'contract',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 5000,
         salaryMax: 8500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C4. Contract Security Auditor / Penetration Tester
      ('99999999-0003-4000-a000-000000000004', '${S.ORG_PAYSTACK}',
       'Contract: Security Auditor / Penetration Tester — 2 Months',
       '${JSON.stringify({
         title: 'Contract Security Auditor / Penetration Tester',
         description: 'Conduct a comprehensive security assessment of our payment platform over a 2-month engagement. You will perform penetration testing, review application code for vulnerabilities, and deliver a detailed report with prioritized remediation recommendations.',
         responsibilities: 'Conduct black-box and white-box penetration testing of payment APIs and web applications. Perform source code security reviews focusing on OWASP Top 10 vulnerabilities. Test authentication, authorization, and session management implementations. Assess infrastructure security including cloud configurations and network segmentation. Deliver a comprehensive report with findings, risk ratings, and remediation guidance.',
         skills: ['Penetration Testing', 'OWASP', 'Burp Suite', 'Python', 'Cloud Security', 'PCI-DSS', 'Code Review'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 7000,
         salaryMax: 12000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C5. Contract Technical Writer (API Documentation)
      ('99999999-0003-4000-a000-000000000005', '${S.ORG_PAYSTACK}',
       'Contract: Technical Writer (API Docs) — 4 Months',
       '${JSON.stringify({
         title: 'Contract Technical Writer (API Documentation)',
         description: 'Help us overhaul our API documentation over a 4-month engagement. You will audit existing docs, restructure the information architecture, write new guides and tutorials, and ensure developers have everything they need to integrate our payment APIs quickly.',
         responsibilities: 'Audit existing API documentation and identify gaps and inconsistencies. Restructure the documentation information architecture for improved discoverability. Write new getting-started guides, integration tutorials, and API reference documentation. Create code samples in JavaScript, Python, PHP, and Ruby. Set up a documentation review and publishing workflow for the engineering team.',
         skills: ['Technical Writing', 'API Documentation', 'OpenAPI/Swagger', 'Markdown', 'JavaScript', 'Git'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 3000,
         salaryMax: 5500,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C6. Contract UI/UX Designer
      ('99999999-0003-4000-a000-000000000006', '${S.ORG_PAYSTACK}',
       'Contract: UI/UX Designer — 3 Months',
       '${JSON.stringify({
         title: 'Contract UI/UX Designer',
         description: 'Join us for a 3-month design sprint to reimagine our merchant onboarding and checkout experiences. You will conduct user research, design end-to-end flows, create a refreshed component library, and work with engineers to bring designs to life.',
         responsibilities: 'Conduct user research and usability testing with African merchants. Design end-to-end user flows for merchant onboarding and payment checkout. Create high-fidelity mockups and interactive prototypes in Figma. Build and document a refreshed UI component library and design tokens. Collaborate with frontend engineers during implementation to ensure design fidelity.',
         skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Interaction Design', 'Usability Testing'],
         jobType: 'contract',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6500,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C7. Contract Performance Engineer
      ('99999999-0003-4000-a000-000000000007', '${S.ORG_PAYSTACK}',
       'Contract: Performance Engineer — 3 Months',
       '${JSON.stringify({
         title: 'Contract Performance Engineer',
         description: 'Help us identify and eliminate performance bottlenecks across our payment platform during a focused 3-month engagement. You will conduct load testing, profile critical paths, optimize database queries, and ensure our systems can handle 10x traffic growth.',
         responsibilities: 'Design and execute load testing scenarios simulating peak transaction volumes. Profile application performance and identify bottlenecks in critical payment paths. Optimize database queries, connection pooling, and caching strategies. Implement application-level performance monitoring and alerting. Deliver a performance optimization report with benchmarks and recommendations.',
         skills: ['Load Testing', 'k6/JMeter', 'APM Tools', 'PostgreSQL', 'Node.js', 'Profiling', 'Caching'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C8. Contract Project Manager
      ('99999999-0003-4000-a000-000000000008', '${S.ORG_PAYSTACK}',
       'Contract: Project Manager — 6 Months',
       '${JSON.stringify({
         title: 'Contract Project Manager',
         description: 'Manage a critical 6-month platform modernization initiative. You will coordinate multiple engineering squads, track milestones, manage risks, and ensure the program is delivered on time and within budget while maintaining clear communication with stakeholders.',
         responsibilities: 'Create and maintain project plans, timelines, and milestone trackers. Coordinate deliverables across 3-4 engineering squads and external vendors. Run weekly status meetings and prepare executive progress reports. Identify risks early and develop mitigation strategies. Manage project budget, resource allocation, and scope changes.',
         skills: ['Project Management', 'Agile/Scrum', 'JIRA', 'Risk Management', 'Stakeholder Communication', 'Budgeting'],
         jobType: 'contract',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 5000,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C9. Contract Cloud Migration Specialist
      ('99999999-0003-4000-a000-000000000009', '${S.ORG_PAYSTACK}',
       'Contract: Cloud Migration Specialist — 4 Months',
       '${JSON.stringify({
         title: 'Contract Cloud Migration Specialist',
         description: 'Lead the migration of legacy on-premise services to AWS over a 4-month engagement. You will assess current infrastructure, design the target cloud architecture, execute the migration with zero downtime, and train internal teams on cloud operations.',
         responsibilities: 'Assess existing on-premise infrastructure and create a cloud migration plan. Design target AWS architecture including VPCs, security groups, and IAM policies. Execute phased migration with zero-downtime cutover strategies. Implement Infrastructure as Code (Terraform) for all migrated services. Train internal DevOps team on AWS operations, monitoring, and cost management.',
         skills: ['AWS', 'Terraform', 'Docker', 'Linux', 'Networking', 'Migration Planning', 'CI/CD'],
         jobType: 'contract',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C10. Contract QA Consultant
      ('99999999-0003-4000-a000-000000000010', '${S.ORG_PAYSTACK}',
       'Contract: QA Consultant — 3 Months',
       '${JSON.stringify({
         title: 'Contract QA Consultant',
         description: 'Establish a comprehensive QA strategy and automation framework during a 3-month engagement. You will assess current testing practices, design a test automation architecture, build the initial test suite, and create a playbook the team can follow after your engagement.',
         responsibilities: 'Assess current QA processes and identify gaps in test coverage. Design a test automation architecture using Cypress, Playwright, and Jest. Build an initial E2E test suite covering critical payment flows. Create CI/CD quality gates and automated regression pipelines. Document QA playbooks, best practices, and training materials for the team.',
         skills: ['Cypress', 'Playwright', 'Jest', 'CI/CD', 'Test Strategy', 'API Testing', 'Postman'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 5000,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1)

      ON CONFLICT DO NOTHING;
    `);

    // ─── CONTRACT TEMPLATES — FLUTTERWAVE (10) ──────────────────
    await queryRunner.query(`
      INSERT INTO job_post_templates (id, employer_id, name, template_data, created_at, updated_at, version)
      VALUES

      -- C1. Contract Mobile Developer (iOS/Swift)
      ('99999999-0004-4000-a000-000000000001', '${S.ORG_FLUTTERWAVE}',
       'Contract: Mobile Developer (iOS/Swift) — 4 Months',
       '${JSON.stringify({
         title: 'Contract Mobile Developer (iOS/Swift)',
         description: 'Build native iOS features for our merchant app during a 4-month engagement. You will implement payment acceptance flows, integrate biometric authentication, and optimize the app for the latest iOS platform capabilities while maintaining backward compatibility.',
         responsibilities: 'Develop native iOS features using Swift and SwiftUI. Implement Apple Pay and in-app payment acceptance flows. Integrate Face ID/Touch ID biometric authentication. Optimize app performance, memory usage, and battery consumption. Write unit and UI tests and prepare builds for App Store submission.',
         skills: ['Swift', 'SwiftUI', 'Xcode', 'Apple Pay', 'Core Data', 'REST APIs', 'TestFlight'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 7500,
         salaryCurrency: 'USD',
         location: 'Remote (Africa timezone preferred)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C2. Contract DevOps Consultant
      ('99999999-0004-4000-a000-000000000002', '${S.ORG_FLUTTERWAVE}',
       'Contract: DevOps Consultant — 3 Months',
       '${JSON.stringify({
         title: 'Contract DevOps Consultant',
         description: 'Modernize our CI/CD pipelines and deployment processes over a 3-month engagement. You will assess current DevOps maturity, implement automated deployment pipelines, set up monitoring and alerting, and establish DevOps best practices across engineering teams.',
         responsibilities: 'Audit existing CI/CD pipelines and recommend improvements. Implement automated build, test, and deployment pipelines with GitHub Actions. Set up centralized logging (ELK), metrics (Prometheus/Grafana), and alerting. Containerize remaining legacy services and migrate to Kubernetes. Create DevOps runbooks and train engineering teams on new tooling.',
         skills: ['GitHub Actions', 'Docker', 'Kubernetes', 'Terraform', 'Prometheus', 'Grafana', 'AWS'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C3. Contract Data Warehouse Architect
      ('99999999-0004-4000-a000-000000000003', '${S.ORG_FLUTTERWAVE}',
       'Contract: Data Warehouse Architect — 4 Months',
       '${JSON.stringify({
         title: 'Contract Data Warehouse Architect',
         description: 'Design and build a modern data warehouse during a 4-month engagement. You will architect the data platform, implement dimensional modeling for payment analytics, set up data quality frameworks, and enable self-service analytics for business teams.',
         responsibilities: 'Design a modern data warehouse architecture on BigQuery or Snowflake. Implement dimensional models (star/snowflake schemas) for payment analytics. Build dbt transformation layers with testing and documentation. Set up data quality monitoring, lineage tracking, and alerting. Enable self-service analytics with semantic layers and business-friendly views.',
         skills: ['BigQuery', 'dbt', 'SQL', 'Data Modeling', 'Airflow', 'Python', 'Looker'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C4. Contract Compliance Consultant
      ('99999999-0004-4000-a000-000000000004', '${S.ORG_FLUTTERWAVE}',
       'Contract: Compliance Consultant — 3 Months',
       '${JSON.stringify({
         title: 'Contract Compliance Consultant',
         description: 'Help us achieve and maintain regulatory compliance across new African markets over a 3-month engagement. You will assess regulatory requirements, develop compliance frameworks, prepare licensing applications, and train internal teams on compliance obligations.',
         responsibilities: 'Assess regulatory requirements for payment operations in target markets. Develop KYC/AML compliance frameworks and policies. Prepare licensing applications and regulatory filings. Conduct compliance gap analysis and create remediation roadmaps. Train compliance and operations teams on new regulatory obligations.',
         skills: ['Regulatory Compliance', 'AML/KYC', 'Risk Assessment', 'Financial Regulations', 'Policy Writing', 'Training'],
         jobType: 'contract',
         workMode: 'hybrid',
         experienceLevel: 'senior',
         salaryMin: 5500,
         salaryMax: 9000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C5. Contract Graphic / Motion Designer
      ('99999999-0004-4000-a000-000000000005', '${S.ORG_FLUTTERWAVE}',
       'Contract: Graphic / Motion Designer — 2 Months',
       '${JSON.stringify({
         title: 'Contract Graphic / Motion Designer',
         description: 'Create a suite of marketing assets and motion graphics for an upcoming product launch during a 2-month engagement. You will produce social media creatives, explainer animations, event banners, and promotional videos that showcase our payment products to African businesses.',
         responsibilities: 'Design social media graphics, banners, and promotional materials. Create short-form motion graphics and explainer animations. Produce assets for event presentations and webinar campaigns. Adapt brand templates for regional marketing campaigns. Deliver organized, export-ready files with usage guidelines.',
         skills: ['Adobe After Effects', 'Adobe Illustrator', 'Photoshop', 'Figma', 'Motion Graphics', 'Video Editing'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 2500,
         salaryMax: 5000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C6. Contract Content Strategist
      ('99999999-0004-4000-a000-000000000006', '${S.ORG_FLUTTERWAVE}',
       'Contract: Content Strategist — 3 Months',
       '${JSON.stringify({
         title: 'Contract Content Strategist',
         description: 'Develop a comprehensive content strategy for our merchant education and developer engagement programs during a 3-month engagement. You will audit existing content, create an editorial calendar, produce key anchor content pieces, and establish a content playbook for the team.',
         responsibilities: 'Audit existing content across website, blog, docs, and social channels. Develop a content strategy aligned with merchant acquisition and developer engagement goals. Create an editorial calendar with content themes, formats, and distribution plans. Produce 10-15 anchor content pieces (blog posts, case studies, guides). Build a content style guide and production playbook for ongoing execution.',
         skills: ['Content Strategy', 'Copywriting', 'SEO', 'Editorial Planning', 'Analytics', 'B2B Marketing'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 3000,
         salaryMax: 5500,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C7. Contract Salesforce Administrator
      ('99999999-0004-4000-a000-000000000007', '${S.ORG_FLUTTERWAVE}',
       'Contract: Salesforce Administrator — 4 Months',
       '${JSON.stringify({
         title: 'Contract Salesforce Administrator',
         description: 'Optimize and customize our Salesforce CRM during a 4-month engagement. You will redesign sales workflows, build custom reports and dashboards, implement automations, integrate with our payment platform APIs, and train the sales team on the new configuration.',
         responsibilities: 'Redesign Salesforce sales pipelines, lead scoring, and workflow automation. Build custom reports, dashboards, and analytics for sales leadership. Implement Salesforce integrations with our payment platform APIs and marketing tools. Configure user roles, permissions, and data security policies. Train sales and operations teams and create admin documentation.',
         skills: ['Salesforce Admin', 'Salesforce Flow', 'SOQL', 'CRM', 'Integration', 'Reporting'],
         jobType: 'contract',
         workMode: 'hybrid',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6000,
         salaryCurrency: 'USD',
         location: 'Lagos, Nigeria'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C8. Contract Full-Stack Developer
      ('99999999-0004-4000-a000-000000000008', '${S.ORG_FLUTTERWAVE}',
       'Contract: Full-Stack Developer — 6 Months',
       '${JSON.stringify({
         title: 'Contract Full-Stack Developer',
         description: 'Build a new merchant self-service portal end-to-end during a 6-month contract. You will own the full stack from database design through API development to frontend implementation, delivering a production-ready portal that empowers merchants to manage their payment operations independently.',
         responsibilities: 'Design and implement database schemas, REST APIs, and frontend interfaces. Build the merchant self-service portal using React, Node.js, and PostgreSQL. Implement authentication, role-based access control, and audit logging. Write comprehensive tests (unit, integration, E2E) and documentation. Collaborate with product and design teams on feature specifications and UX.',
         skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs', 'Docker', 'Git'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 4500,
         salaryMax: 8000,
         salaryCurrency: 'USD',
         location: 'Remote (Africa timezone preferred)'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C9. Contract ML / AI Consultant
      ('99999999-0004-4000-a000-000000000009', '${S.ORG_FLUTTERWAVE}',
       'Contract: ML / AI Consultant — 3 Months',
       '${JSON.stringify({
         title: 'Contract ML / AI Consultant',
         description: 'Develop and deploy a fraud detection model during a 3-month engagement. You will analyze historical transaction data, engineer features, train and evaluate models, and deploy the winning model to production with real-time inference capabilities.',
         responsibilities: 'Analyze historical transaction data to identify fraud patterns and features. Engineer features and build training datasets from payment event streams. Train, evaluate, and compare multiple ML model architectures. Deploy the production model with real-time inference and monitoring. Document model methodology, performance metrics, and maintenance procedures.',
         skills: ['Python', 'scikit-learn', 'XGBoost', 'Feature Engineering', 'MLflow', 'SQL', 'FastAPI'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'senior',
         salaryMin: 6000,
         salaryMax: 10000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1),

      -- C10. Contract Localization / i18n Specialist
      ('99999999-0004-4000-a000-000000000010', '${S.ORG_FLUTTERWAVE}',
       'Contract: Localization / i18n Specialist — 2 Months',
       '${JSON.stringify({
         title: 'Contract Localization / i18n Specialist',
         description: 'Internationalize our merchant dashboard and payment pages for 5 new African markets during a 2-month engagement. You will implement i18n infrastructure, coordinate translations, adapt UI for RTL languages, and ensure currency and date formatting works correctly across all target locales.',
         responsibilities: 'Implement i18n infrastructure using react-intl or next-intl across the frontend. Extract and organize translatable strings into locale resource files. Coordinate professional translations for French, Portuguese, Arabic, Swahili, and Amharic. Adapt UI layouts for RTL languages and variable-length translations. Test and validate locale-specific currency, number, and date formatting.',
         skills: ['React', 'i18n/l10n', 'TypeScript', 'Translation Management', 'RTL Design', 'Unicode'],
         jobType: 'contract',
         workMode: 'remote',
         experienceLevel: 'mid',
         salaryMin: 3500,
         salaryMax: 6000,
         salaryCurrency: 'USD',
         location: 'Remote'
       }).replace(/'/g, "''")}',
       NOW(), NOW(), 1)

      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete Paystack templates (IDs: 99999999-0001-4000-a000-0000000000XX)
    await queryRunner.query(`
      DELETE FROM job_post_templates
      WHERE id IN (
        '99999999-0001-4000-a000-000000000001',
        '99999999-0001-4000-a000-000000000002',
        '99999999-0001-4000-a000-000000000003',
        '99999999-0001-4000-a000-000000000004',
        '99999999-0001-4000-a000-000000000005',
        '99999999-0001-4000-a000-000000000006',
        '99999999-0001-4000-a000-000000000007',
        '99999999-0001-4000-a000-000000000008',
        '99999999-0001-4000-a000-000000000009',
        '99999999-0001-4000-a000-000000000010',
        '99999999-0001-4000-a000-000000000011',
        '99999999-0001-4000-a000-000000000012',
        '99999999-0001-4000-a000-000000000013',
        '99999999-0001-4000-a000-000000000014',
        '99999999-0001-4000-a000-000000000015',
        '99999999-0001-4000-a000-000000000016',
        '99999999-0001-4000-a000-000000000017',
        '99999999-0001-4000-a000-000000000018',
        '99999999-0001-4000-a000-000000000019',
        '99999999-0001-4000-a000-000000000020',
        '99999999-0001-4000-a000-000000000021',
        '99999999-0001-4000-a000-000000000022',
        '99999999-0001-4000-a000-000000000023',
        '99999999-0001-4000-a000-000000000024',
        '99999999-0001-4000-a000-000000000025'
      );
    `);

    // Delete Flutterwave full-time templates (IDs: 99999999-0002-4000-a000-0000000000XX)
    await queryRunner.query(`
      DELETE FROM job_post_templates
      WHERE id IN (
        '99999999-0002-4000-a000-000000000001',
        '99999999-0002-4000-a000-000000000002',
        '99999999-0002-4000-a000-000000000003',
        '99999999-0002-4000-a000-000000000004',
        '99999999-0002-4000-a000-000000000005',
        '99999999-0002-4000-a000-000000000006',
        '99999999-0002-4000-a000-000000000007',
        '99999999-0002-4000-a000-000000000008',
        '99999999-0002-4000-a000-000000000009',
        '99999999-0002-4000-a000-000000000010',
        '99999999-0002-4000-a000-000000000011',
        '99999999-0002-4000-a000-000000000012',
        '99999999-0002-4000-a000-000000000013',
        '99999999-0002-4000-a000-000000000014',
        '99999999-0002-4000-a000-000000000015',
        '99999999-0002-4000-a000-000000000016',
        '99999999-0002-4000-a000-000000000017',
        '99999999-0002-4000-a000-000000000018',
        '99999999-0002-4000-a000-000000000019',
        '99999999-0002-4000-a000-000000000020',
        '99999999-0002-4000-a000-000000000021',
        '99999999-0002-4000-a000-000000000022',
        '99999999-0002-4000-a000-000000000023',
        '99999999-0002-4000-a000-000000000024',
        '99999999-0002-4000-a000-000000000025'
      );
    `);

    // Delete Paystack contract templates (IDs: 99999999-0003-4000-a000-0000000000XX)
    await queryRunner.query(`
      DELETE FROM job_post_templates
      WHERE id IN (
        '99999999-0003-4000-a000-000000000001',
        '99999999-0003-4000-a000-000000000002',
        '99999999-0003-4000-a000-000000000003',
        '99999999-0003-4000-a000-000000000004',
        '99999999-0003-4000-a000-000000000005',
        '99999999-0003-4000-a000-000000000006',
        '99999999-0003-4000-a000-000000000007',
        '99999999-0003-4000-a000-000000000008',
        '99999999-0003-4000-a000-000000000009',
        '99999999-0003-4000-a000-000000000010'
      );
    `);

    // Delete Flutterwave contract templates (IDs: 99999999-0004-4000-a000-0000000000XX)
    await queryRunner.query(`
      DELETE FROM job_post_templates
      WHERE id IN (
        '99999999-0004-4000-a000-000000000001',
        '99999999-0004-4000-a000-000000000002',
        '99999999-0004-4000-a000-000000000003',
        '99999999-0004-4000-a000-000000000004',
        '99999999-0004-4000-a000-000000000005',
        '99999999-0004-4000-a000-000000000006',
        '99999999-0004-4000-a000-000000000007',
        '99999999-0004-4000-a000-000000000008',
        '99999999-0004-4000-a000-000000000009',
        '99999999-0004-4000-a000-000000000010'
      );
    `);
  }
}
