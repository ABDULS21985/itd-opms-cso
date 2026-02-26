import { DataSource } from 'typeorm';
import { SkillTag } from '../../modules/taxonomy/entities/skill-tag.entity';
import { generateSlug } from '../../common/utils/slug.util';

const SKILLS = [
  // Frontend
  { name: 'React', category: 'Frontend' },
  { name: 'Vue.js', category: 'Frontend' },
  { name: 'Angular', category: 'Frontend' },
  { name: 'Next.js', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'JavaScript', category: 'Frontend' },
  { name: 'HTML/CSS', category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'Redux', category: 'Frontend' },
  { name: 'GraphQL', category: 'Frontend' },
  { name: 'Svelte', category: 'Frontend' },

  // Backend
  { name: 'Node.js', category: 'Backend' },
  { name: 'NestJS', category: 'Backend' },
  { name: 'Express', category: 'Backend' },
  { name: 'Python', category: 'Backend' },
  { name: 'Django', category: 'Backend' },
  { name: 'Flask', category: 'Backend' },
  { name: 'Go', category: 'Backend' },
  { name: 'Java', category: 'Backend' },
  { name: 'Spring Boot', category: 'Backend' },
  { name: 'PHP', category: 'Backend' },
  { name: 'Laravel', category: 'Backend' },
  { name: 'Ruby on Rails', category: 'Backend' },
  { name: 'C#', category: 'Backend' },
  { name: '.NET', category: 'Backend' },
  { name: 'Rust', category: 'Backend' },

  // Mobile
  { name: 'React Native', category: 'Mobile' },
  { name: 'Flutter', category: 'Mobile' },
  { name: 'Swift', category: 'Mobile' },
  { name: 'Kotlin', category: 'Mobile' },
  { name: 'iOS Development', category: 'Mobile' },
  { name: 'Android Development', category: 'Mobile' },

  // Data/AI
  { name: 'Machine Learning', category: 'Data/AI' },
  { name: 'TensorFlow', category: 'Data/AI' },
  { name: 'PyTorch', category: 'Data/AI' },
  { name: 'Pandas', category: 'Data/AI' },
  { name: 'Data Analysis', category: 'Data/AI' },
  { name: 'Power BI', category: 'Data/AI' },
  { name: 'Tableau', category: 'Data/AI' },
  { name: 'R', category: 'Data/AI' },
  { name: 'Natural Language Processing', category: 'Data/AI' },
  { name: 'Computer Vision', category: 'Data/AI' },

  // DevOps
  { name: 'Docker', category: 'DevOps' },
  { name: 'Kubernetes', category: 'DevOps' },
  { name: 'AWS', category: 'DevOps' },
  { name: 'Azure', category: 'DevOps' },
  { name: 'GCP', category: 'DevOps' },
  { name: 'CI/CD', category: 'DevOps' },
  { name: 'Terraform', category: 'DevOps' },
  { name: 'Ansible', category: 'DevOps' },
  { name: 'Linux', category: 'DevOps' },
  { name: 'Nginx', category: 'DevOps' },
  { name: 'GitHub Actions', category: 'DevOps' },

  // Database
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'MySQL', category: 'Database' },
  { name: 'MongoDB', category: 'Database' },
  { name: 'Redis', category: 'Database' },
  { name: 'Elasticsearch', category: 'Database' },
  { name: 'DynamoDB', category: 'Database' },
  { name: 'Firebase', category: 'Database' },
  { name: 'Supabase', category: 'Database' },

  // Security
  { name: 'Cybersecurity', category: 'Security' },
  { name: 'Penetration Testing', category: 'Security' },
  { name: 'Network Security', category: 'Security' },
  { name: 'OWASP', category: 'Security' },

  // Design
  { name: 'Figma', category: 'Design' },
  { name: 'Adobe XD', category: 'Design' },
  { name: 'UI Design', category: 'Design' },
  { name: 'UX Research', category: 'Design' },
  { name: 'Prototyping', category: 'Design' },

  // Other
  { name: 'Git', category: 'Other' },
  { name: 'REST API', category: 'Other' },
  { name: 'Microservices', category: 'Other' },
  { name: 'Agile', category: 'Other' },
  { name: 'Scrum', category: 'Other' },
  { name: 'Technical Writing', category: 'Other' },
  { name: 'Product Management', category: 'Other' },
  { name: 'Project Management', category: 'Other' },
];

export async function seedSkills(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(SkillTag);

  for (const skill of SKILLS) {
    const exists = await repo.findOne({ where: { name: skill.name } });
    if (!exists) {
      await repo.save(
        repo.create({
          name: skill.name,
          slug: generateSlug(skill.name),
          category: skill.category,
          isActive: true,
          usageCount: 0,
        }),
      );
    }
  }

  console.log(`Seeded ${SKILLS.length} skills`);
}
