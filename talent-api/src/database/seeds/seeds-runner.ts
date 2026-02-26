import { DataSource } from 'typeorm';
import { seedSkills } from './skills-taxonomy.seed';
import { seedTracks } from './tracks.seed';

async function runSeeds(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5434', 10),
    username: process.env.DB_USER || 'talent_portal',
    password: process.env.DB_PASSWORD || 'talent_portal',
    database: process.env.DB_NAME || 'talent_portal_db',
    entities: [__dirname + '/../../modules/**/entities/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected. Running seeds...');

    await seedSkills(dataSource);
    await seedTracks(dataSource);

    console.log('All seeds completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
