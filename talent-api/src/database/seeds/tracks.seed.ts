import { DataSource } from 'typeorm';
import { Track } from '../../modules/taxonomy/entities/track.entity';
import { generateSlug } from '../../common/utils/slug.util';

const TRACKS = [
  {
    name: 'Backend Development',
    description: 'Server-side development, APIs, databases, and system architecture',
    iconName: 'Server',
    displayOrder: 1,
  },
  {
    name: 'Frontend Development',
    description: 'Client-side development, UI/UX implementation, and web applications',
    iconName: 'Monitor',
    displayOrder: 2,
  },
  {
    name: 'Mobile Development',
    description: 'iOS, Android, and cross-platform mobile application development',
    iconName: 'Smartphone',
    displayOrder: 3,
  },
  {
    name: 'Data/AI/ML',
    description: 'Data science, artificial intelligence, and machine learning',
    iconName: 'Brain',
    displayOrder: 4,
  },
  {
    name: 'DevOps/Cloud',
    description: 'Cloud infrastructure, CI/CD, containerization, and deployment',
    iconName: 'Cloud',
    displayOrder: 5,
  },
  {
    name: 'Security',
    description: 'Cybersecurity, penetration testing, and security engineering',
    iconName: 'Shield',
    displayOrder: 6,
  },
  {
    name: 'QA/Testing',
    description: 'Quality assurance, automated testing, and test engineering',
    iconName: 'TestTube',
    displayOrder: 7,
  },
  {
    name: 'Product Management',
    description: 'Product strategy, roadmap planning, and stakeholder management',
    iconName: 'BarChart',
    displayOrder: 8,
  },
  {
    name: 'UI/UX Design',
    description: 'User interface design, user experience research, and prototyping',
    iconName: 'Palette',
    displayOrder: 9,
  },
];

export async function seedTracks(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Track);

  for (const track of TRACKS) {
    const exists = await repo.findOne({ where: { name: track.name } });
    if (!exists) {
      await repo.save(
        repo.create({
          name: track.name,
          slug: generateSlug(track.name),
          description: track.description,
          iconName: track.iconName,
          displayOrder: track.displayOrder,
          isActive: true,
        }),
      );
    }
  }

  console.log(`Seeded ${TRACKS.length} tracks`);
}
