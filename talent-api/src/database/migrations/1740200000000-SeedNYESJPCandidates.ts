import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds 194 candidate accounts from the
 * "National Youth Employability Skills and Job Placement Programme" Excel file.
 *
 * All accounts use the default password: Password123!
 * Profiles are created as SUBMITTED status so admin can review them.
 */
export class SeedNYESJPCandidates1740200000000 implements MigrationInterface {
  name = 'SeedNYESJPCandidates1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── ENSURE TRACKS EXIST ──────────────────────────────────────
    // The spreadsheet references tracks that may not exist yet in the DB.
    await queryRunner.query(`
      INSERT INTO tracks (id, name, slug, description, icon_name, display_order, is_active, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'Frontend Development', 'frontend-development', 'Frontend web development with modern frameworks', 'monitor', 4, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Backend Development', 'backend-development', 'Server-side development and API design', 'server', 5, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Full-Stack Development', 'full-stack-development', 'End-to-end web application development', 'layers', 6, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Mobile Development', 'mobile-development', 'iOS and Android mobile app development', 'smartphone', 7, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Data Science & Analytics', 'data-science-analytics', 'Data analysis, machine learning and AI', 'bar-chart-3', 8, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'DevOps & Cloud', 'devops-cloud', 'Cloud infrastructure and CI/CD pipelines', 'cloud', 9, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Cybersecurity', 'cybersecurity', 'Information security and threat protection', 'shield-check', 10, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Product Management', 'product-management', 'Product strategy and delivery', 'target', 11, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'Quality Assurance', 'quality-assurance', 'Software testing and quality engineering', 'check-circle-2', 12, true, NOW(), NOW(), 1),
        (gen_random_uuid(), 'UI/UX Design', 'ui-ux-design', 'User interface and experience design', 'palette', 13, true, NOW(), NOW(), 1)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ─── TALENT USERS ────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('0a857d1c-c581-407a-be92-12d291227640', 'seed-candidate-001', 'lukmanlamid@yahoo.com', 'Lukman Idowu Lamid', 'candidate', '[]', NOW(), NOW(), 1),
        ('3242df13-09d9-4b73-8393-09035718dd8b', 'seed-candidate-002', 'muhdgazzali01@gmail.com', 'Garzali Garo Ahmad', 'candidate', '[]', NOW(), NOW(), 1),
        ('5f59e8e4-61ba-44cc-8604-60ea07ff0d43', 'seed-candidate-003', 'devabdulnas@gmail.com', 'Abdullahi Nasir', 'candidate', '[]', NOW(), NOW(), 1),
        ('ca73024e-8674-4c32-bd42-2d9f9e13dfea', 'seed-candidate-004', 'tukurmohammad8@gmail.com', 'Mohammad Bashir Tukur', 'candidate', '[]', NOW(), NOW(), 1),
        ('76c49df4-e6f4-4f44-941b-40defd35474e', 'seed-candidate-005', 'umaralfaruq02@gmail.com', 'Umar Adamu', 'candidate', '[]', NOW(), NOW(), 1),
        ('3df62a90-612a-4b0e-944e-b9f42ea46229', 'seed-candidate-006', 'alikumo04@gmail.com', 'Aisha Muhammad Ali', 'candidate', '[]', NOW(), NOW(), 1),
        ('2a59fca8-ec6b-477b-b0d5-bb5fc2c572b6', 'seed-candidate-007', 'wamayiismaila3@gmail.com', 'Wamayi Ismaila Garki', 'candidate', '[]', NOW(), NOW(), 1),
        ('97aa5a08-156c-4a8a-bb80-4b983eb2eb0f', 'seed-candidate-008', 'iiirafindadi@gmail.com', 'Ibrahim Ismail Rafindadi', 'candidate', '[]', NOW(), NOW(), 1),
        ('c49b1eac-faf3-42d9-97bd-cb79c39aa91c', 'seed-candidate-009', 'abdulbasitadamu3@gmail.com', 'Abdulbasit Adamu', 'candidate', '[]', NOW(), NOW(), 1),
        ('1b33c6df-e79d-404d-93e2-833a788ffb49', 'seed-candidate-010', 'sanimahmoud10@gmail.com', 'Mahmoud Muhammad Sani', 'candidate', '[]', NOW(), NOW(), 1),
        ('b220ac18-156f-412d-a98c-13db2cc70e1b', 'seed-candidate-011', 'kongidehmmorlarh@gmail.com', 'Ademola Sodiq kongi', 'candidate', '[]', NOW(), NOW(), 1),
        ('ac899d18-445b-4aac-b1a9-74f71c1450b5', 'seed-candidate-012', 'sulehlaraba@gmail.com', 'LARABA SULEH', 'candidate', '[]', NOW(), NOW(), 1),
        ('5dd9b4db-addc-4568-952a-c1eb30b35bec', 'seed-candidate-013', 'michaelmike232@gmail.com', 'Mike Michael', 'candidate', '[]', NOW(), NOW(), 1),
        ('97431f61-64c5-41cc-9642-c1cc294e0743', 'seed-candidate-014', 'olasupoazeezolawale@gmail.com', 'OLASUPO Azeez Olawale', 'candidate', '[]', NOW(), NOW(), 1),
        ('f22a64d3-6f3c-4e96-9a71-525f050356f6', 'seed-candidate-015', 'saliskhaan@gmail.com', 'Abdulkarim Salisu', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('5a87fcc9-835b-4d82-a3c4-c391505a5282', 'seed-candidate-016', 'aafuntuwa99@gmail.com', 'Abdulrahman Abubakar', 'candidate', '[]', NOW(), NOW(), 1),
        ('8ec21af7-5898-45b8-8e7e-d336b1854688', 'seed-candidate-017', 'nafisatfaruk5@gmail.com', 'Nafisat Sanusi', 'candidate', '[]', NOW(), NOW(), 1),
        ('33531039-7748-4162-9f8e-3aef92d41f29', 'seed-candidate-018', 'abbasmuhammadshuwa@gmail.com', 'Abbas Muhammad Shuwa', 'candidate', '[]', NOW(), NOW(), 1),
        ('7216c13f-37b1-400d-8a72-dc313847709f', 'seed-candidate-019', 'ybabali16@gmail.com', 'Yarima Adamu Babali', 'candidate', '[]', NOW(), NOW(), 1),
        ('c7b4f1d4-6449-486d-95a1-251985c47167', 'seed-candidate-020', 'enakenergy@gmail.com', 'Chukwuemeka Edwin Nnadi', 'candidate', '[]', NOW(), NOW(), 1),
        ('f57b4f60-9e2e-45d1-979e-dd8c9f874d5d', 'seed-candidate-021', 'aaliyu492@gmail.com', 'Abubakar Aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('768e9867-e924-4827-a5fd-388cc6eec935', 'seed-candidate-022', 'ssawudu@gmail.com', 'Shehu Awudu Samnujoma', 'candidate', '[]', NOW(), NOW(), 1),
        ('a9cdcca1-197b-4e12-89d0-f804ce631478', 'seed-candidate-023', 'jabiriliyasushinkafi@gmail.com', 'Jabir Iliyasu', 'candidate', '[]', NOW(), NOW(), 1),
        ('828eea7c-8bdd-4e82-9ef7-db1ff6e9245d', 'seed-candidate-024', 'michaelmike234@gmail.com', 'Mike Michael', 'candidate', '[]', NOW(), NOW(), 1),
        ('8318d716-8f14-4ab4-9c5c-e71e5d3c5c73', 'seed-candidate-025', 'abdulsamadabbas21@gmail.com', 'Abdulsamad Abbas', 'candidate', '[]', NOW(), NOW(), 1),
        ('2198b8ee-189f-4792-adaa-612eaaecdf28', 'seed-candidate-026', 'mubarakmohammed19944@gmail.com', 'Mubarak Mohammed Abdullahi', 'candidate', '[]', NOW(), NOW(), 1),
        ('bd334af7-b215-4021-bd37-bb1d2120362a', 'seed-candidate-027', 'tgoldent82@gmail.com', 'Olorunosebi Dhikrat Motunraryo', 'candidate', '[]', NOW(), NOW(), 1),
        ('993bb92a-5e96-4342-b10b-5acd7c90e8f2', 'seed-candidate-028', 'abbascogaladima@gmail.com', 'Musa Hussaini', 'candidate', '[]', NOW(), NOW(), 1),
        ('4fa76119-9050-4583-9c64-f4fa3a18f98c', 'seed-candidate-029', 'abdullahi.shuaibualiyu@gmail.com', 'Abdullahi Shuaibu Aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('11c552b8-37fa-4645-9882-1af2e78ead31', 'seed-candidate-030', 'aadamufaggo@gmail.com', 'ABUBAKAR ADAMU FAGGO', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('e55c37db-84fd-4403-b5be-7c66bf31c2b0', 'seed-candidate-031', '081abdulrashidaliyu@gmail.com', 'Abdulrashid aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('2dd3b239-adac-439e-9caf-6d1050a655fc', 'seed-candidate-032', 'olamideomisanmi@gmail.com', 'Olamide David Omisanmi', 'candidate', '[]', NOW(), NOW(), 1),
        ('5b4a8a45-72b3-4cbd-af20-b2785b5d00eb', 'seed-candidate-033', 'mydotstyle@gmail.com', 'Kabiru Usman', 'candidate', '[]', NOW(), NOW(), 1),
        ('9a6d5de1-4f05-4e31-a45c-7d58b04a6f7b', 'seed-candidate-034', 'emmanuelolafusi.digifyng@gmail.com', 'Emmanuel Olafusi', 'candidate', '[]', NOW(), NOW(), 1),
        ('87916707-9093-4f4f-972b-a1f027ba2d3a', 'seed-candidate-035', 'abbahusummcy@gmail.com', 'Usman Aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('d566c322-84ab-401a-a486-b1f5d4ad4bc9', 'seed-candidate-036', 'abbasabdullahik3@gmail.com', 'Abbas Abdullahi', 'candidate', '[]', NOW(), NOW(), 1),
        ('c7a065ab-45e8-4e6b-98e7-4e72397cdcf2', 'seed-candidate-037', 'mohammedfanta7@gmail.com', 'Mohammed Kadir Segun', 'candidate', '[]', NOW(), NOW(), 1),
        ('ce2e01d7-a7b4-40cb-9293-bfb2ebce6d01', 'seed-candidate-038', 'aanyasougo@gmail.com', 'Victor Ugochukwu Anyaso', 'candidate', '[]', NOW(), NOW(), 1),
        ('4e4fd58f-dc9a-4e73-8e8e-ddf39b0d6091', 'seed-candidate-039', 'danielyamaip112@gmail.com', 'Daniel Yamai Philips', 'candidate', '[]', NOW(), NOW(), 1),
        ('a3536a70-9055-49ae-a7aa-6adf065b9c29', 'seed-candidate-040', 'muyinajim@gmail.com', 'Muyideen Olufemi NAJIM', 'candidate', '[]', NOW(), NOW(), 1),
        ('d2e7b6cd-e32e-4799-92a8-3cd170386c39', 'seed-candidate-041', 'abubakaradamu163@gmail.com', 'Abubakar Adamu Sani', 'candidate', '[]', NOW(), NOW(), 1),
        ('f7bf7981-73ed-42a9-91c7-11a6fa4da5d4', 'seed-candidate-042', 'olaniyiolafusi@pg-student.oauife.edu.ng', 'Olaniyi Olafusi', 'candidate', '[]', NOW(), NOW(), 1),
        ('983ce9fa-6ec6-46e5-9837-7dbdcd8a89b9', 'seed-candidate-043', 'hemmy4sucess@gmail.com', 'Emmanuel Olafusi', 'candidate', '[]', NOW(), NOW(), 1),
        ('968b20a1-9646-4546-be16-e71bee884acf', 'seed-candidate-044', 'iliyataita@gmail.com', 'Taita Iliya', 'candidate', '[]', NOW(), NOW(), 1),
        ('894e27b1-b5bb-4830-9151-2ca1d2277446', 'seed-candidate-045', 'dagusansi21@gmail.com', 'Dagus Ansi', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('3ad6fdbb-f673-4d7b-897d-868de32fc379', 'seed-candidate-046', 'itukur212@gmail.com', 'Ibrahim Tukur', 'candidate', '[]', NOW(), NOW(), 1),
        ('b209da5a-c0ff-4910-b045-5e5f9706c616', 'seed-candidate-047', 'okechukwueke84@gmail.com', 'Okechukwu Eke Okorie', 'candidate', '[]', NOW(), NOW(), 1),
        ('50b5caf4-a82d-4dce-9c3e-ece6a35d99b0', 'seed-candidate-048', 'legendarycolins@yahoo.com', 'Uwabor Collins', 'candidate', '[]', NOW(), NOW(), 1),
        ('0360b4a5-a3b0-422b-b5c9-686a23b1a61f', 'seed-candidate-049', 'asanigumel2@gmail.com', 'AHMAD MUHAMMAD', 'candidate', '[]', NOW(), NOW(), 1),
        ('f9bfd5ae-7c6b-44a7-a6b9-0c67bb95690d', 'seed-candidate-050', 'kanawaallme@gmail.com', 'Samaila Musa Bah', 'candidate', '[]', NOW(), NOW(), 1),
        ('ac7e1664-68d7-4d80-a64c-becf53774f92', 'seed-candidate-051', 'umahalidu@gmail.com', 'Halidu Ibrahim Umar', 'candidate', '[]', NOW(), NOW(), 1),
        ('91ea880c-563f-47a7-a6d5-85fb043c4482', 'seed-candidate-052', 'e-isiomoigberale@uniben.edu', 'EHISUORIA ISI-OMOIGBERALE', 'candidate', '[]', NOW(), NOW(), 1),
        ('24ed285c-cc31-49aa-8989-dfef9c867d8a', 'seed-candidate-053', 'abbamin30@gmail.com', 'Aminu surajo', 'candidate', '[]', NOW(), NOW(), 1),
        ('d14c2a19-3239-4a27-8d0b-38f6a8e0d605', 'seed-candidate-054', 'orokgospel@gmail.com', 'Gospel Theodore Orok', 'candidate', '[]', NOW(), NOW(), 1),
        ('f775a244-4431-4c5b-981b-492b73bb3b46', 'seed-candidate-055', 'd.jpetosky@gmail.com', 'Peter Bassey', 'candidate', '[]', NOW(), NOW(), 1),
        ('8e45c5e5-1b2c-4fe2-b96d-36c08192c078', 'seed-candidate-056', 'asenso95@gmail.com', 'Benjamin Asenso', 'candidate', '[]', NOW(), NOW(), 1),
        ('f5d230ba-7043-42c6-882d-d6f6f76c4b66', 'seed-candidate-057', 'muqtadirabdul2@gmail.com', 'Abdul-Muqtadir Zukaneni', 'candidate', '[]', NOW(), NOW(), 1),
        ('257d5333-e305-49c0-8140-b16fe8c70e7a', 'seed-candidate-058', 'davidgsongs@gmail.com', 'Godson David', 'candidate', '[]', NOW(), NOW(), 1),
        ('1d94ddc5-4ec1-460d-be6b-e3f3dc582273', 'seed-candidate-059', 'omojasola19@gmail.com', 'Olatunji Rafiu Omojasola', 'candidate', '[]', NOW(), NOW(), 1),
        ('c5dfae12-5c2d-4c2e-ae8a-680d8a49bbe2', 'seed-candidate-060', 'majiid.ib@gmail.com', 'Abdulmajid Ibrahim', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('fa21adb6-391d-4dd1-9913-ac3d0359d438', 'seed-candidate-061', 'abahmad03@gmail.com', 'Abdussalam Babawuro Ahmad', 'candidate', '[]', NOW(), NOW(), 1),
        ('29ba6b20-50b9-4f00-9a02-340883bb2a1e', 'seed-candidate-062', 'eberendukings@gmail.com', 'Kingsley Eberendu', 'candidate', '[]', NOW(), NOW(), 1),
        ('ebafcbd6-b723-48d1-aba0-b2c0eed9400a', 'seed-candidate-063', 'abbabulamaabba2020@gmail.com', 'Abba bulama abba', 'candidate', '[]', NOW(), NOW(), 1),
        ('3ca3c5a4-38b0-4041-b40a-578f4ff9e0d2', 'seed-candidate-064', 'aliyuusman64@gmail.com', 'Aliyu Usman', 'candidate', '[]', NOW(), NOW(), 1),
        ('dd4fd665-dd32-44ad-ac18-fd0311ced12f', 'seed-candidate-065', 'autaahmed1@gmail.com', 'Ahmed Anas Auta', 'candidate', '[]', NOW(), NOW(), 1),
        ('3a7af04e-7f72-4721-b660-de16ac90d1f1', 'seed-candidate-066', 'amincisamson@gmail.com', 'AMINCHI SAMSON', 'candidate', '[]', NOW(), NOW(), 1),
        ('db116671-8144-4dae-ac82-67bfd7022c30', 'seed-candidate-067', 'shadrach.abdul@gmail.com', 'Test Run', 'candidate', '[]', NOW(), NOW(), 1),
        ('adceab09-7b93-4a81-a773-2fe19e16ac58', 'seed-candidate-068', 'paragonaesthetics2022@gmail.com', 'OLASUPO Azeez Olawale', 'candidate', '[]', NOW(), NOW(), 1),
        ('e70f6a59-88de-428d-97f7-f18093072753', 'seed-candidate-069', 'hassanyus581@gmail.com', 'Hassan Yusuf', 'candidate', '[]', NOW(), NOW(), 1),
        ('b6b1fc6b-6b42-4f79-bb86-9222c3abad0d', 'seed-candidate-070', 'okorodandyj@gmail.com', 'Okoro Dandy Junior', 'candidate', '[]', NOW(), NOW(), 1),
        ('f8e8b3fc-297e-43ea-85ad-1f5a7014526b', 'seed-candidate-071', 'umarzkidz@gmail.com', 'Umar Rabiu', 'candidate', '[]', NOW(), NOW(), 1),
        ('4921240d-4561-4073-b01c-6a69df8e4be2', 'seed-candidate-072', 'salisuaminu615@gmail.com', 'Salisu Aminu Abdurrahman', 'candidate', '[]', NOW(), NOW(), 1),
        ('737b227c-da35-42c2-8f7f-d51e3d8ec4c9', 'seed-candidate-073', 'abbamagaj01@gmail.com', 'Abba Magaji', 'candidate', '[]', NOW(), NOW(), 1),
        ('61a25f62-a27d-4eec-b459-3df43763b675', 'seed-candidate-074', 'smtpwtf@gmail.com', 'Oladimeji Toba Olabisi', 'candidate', '[]', NOW(), NOW(), 1),
        ('049f62c6-e9da-4bac-ac36-bc003fed5d7c', 'seed-candidate-075', 'henryonyekachim@gmail.com', 'Henry Chukwuma', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('a0c604c7-9bd4-462f-a666-897c36468c5d', 'seed-candidate-076', 'aarumah234@gmail.com', 'Ahmad Abdulrashid', 'candidate', '[]', NOW(), NOW(), 1),
        ('f80db231-2271-4386-ab59-d0c5e6350570', 'seed-candidate-077', 'lawalalilawal@gmail.com', 'Lawal Lawal Ali', 'candidate', '[]', NOW(), NOW(), 1),
        ('ea3788ef-da37-4426-b125-9684c565f095', 'seed-candidate-078', 'olufolakunmio@gmail.com', 'Folakunmi Ojemuyiwa', 'candidate', '[]', NOW(), NOW(), 1),
        ('b1587f0c-11ee-4110-a483-c73e06616e35', 'seed-candidate-079', 'jafarmk2001@gmail.com', 'Jafar Mukhtar', 'candidate', '[]', NOW(), NOW(), 1),
        ('5ed893df-0938-4fae-889c-9a437d56c5d4', 'seed-candidate-080', 'ogbolokochibuike@gmail.com', 'Chibuike Ogboloko', 'candidate', '[]', NOW(), NOW(), 1),
        ('b54ffe2f-3db7-47a5-9de1-19bbc14a75ef', 'seed-candidate-081', 'emmanuelkenechukwu123@gmail.com', 'NWANAMA EMMANUEL KENECHUKWU', 'candidate', '[]', NOW(), NOW(), 1),
        ('97ccb2df-1f62-4b0c-8dac-733338a58721', 'seed-candidate-082', 'harrison.nwosu@yahoo.co.uk', 'Nwosu Harrison Chukwunyere', 'candidate', '[]', NOW(), NOW(), 1),
        ('320dfc4a-1929-44d5-a655-c692125b975e', 'seed-candidate-083', 'abbakarbala09@gmail.com', 'Abubakar Bala', 'candidate', '[]', NOW(), NOW(), 1),
        ('8eb89e3f-8103-4d5e-8b0a-b10d5320d4a5', 'seed-candidate-084', 'abachajohnesson@gmail.com', 'Abacha John Esson', 'candidate', '[]', NOW(), NOW(), 1),
        ('539b9239-e92d-4ce5-83a5-a50ee468cbf1', 'seed-candidate-085', 'abbasmusaabbas3@gmail.com', 'Abbas Musa Abbas', 'candidate', '[]', NOW(), NOW(), 1),
        ('4f58e507-10ca-44a0-bbbd-92db97a29bc9', 'seed-candidate-086', 'remilekun95@gmail.com', 'Remilekun Olakunle', 'candidate', '[]', NOW(), NOW(), 1),
        ('53dc7622-a0b2-4d77-ab18-3dd4dc46af83', 'seed-candidate-087', 'isyakuisya@gmail.com', 'Isya Isyaku', 'candidate', '[]', NOW(), NOW(), 1),
        ('ac134757-ec66-4c58-88f9-6f98197134c4', 'seed-candidate-088', 'abahsunday62@gmail.com', 'Abah Joseph Sunday', 'candidate', '[]', NOW(), NOW(), 1),
        ('20631b22-df4f-4aab-9774-7ed6a10b53ea', 'seed-candidate-089', 'olajideadejoro@gmail.com', 'Olajide Adejoro Peter', 'candidate', '[]', NOW(), NOW(), 1),
        ('4cd0a769-9178-4b34-af5f-a136dc44694a', 'seed-candidate-090', 'michaelobaro7@gmail.com', 'MICHAEL', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('ca01be65-bec4-4119-bf14-1eafa1f271b4', 'seed-candidate-091', 'sbellojby@gmail.com', 'Suleiman Bello', 'candidate', '[]', NOW(), NOW(), 1),
        ('77033cb8-70be-46bd-a071-508d8212f4de', 'seed-candidate-092', 'sabasulaiman6@gmail.com', 'Saba Sulaiman Abiodun', 'candidate', '[]', NOW(), NOW(), 1),
        ('8d20a25f-8ae8-49e0-9dc4-4ad2aa94a684', 'seed-candidate-093', 'aaliyuddw@gmail.com', 'Abdulganiyu Aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('39155e8b-3397-45ed-b77c-26de34876f05', 'seed-candidate-094', 'edugwuchimeremeze@gmail.com', 'Elom Cornelius Monday', 'candidate', '[]', NOW(), NOW(), 1),
        ('139b07a0-8a60-419e-8751-6443074cf609', 'seed-candidate-095', 'isbala17@gmail.com', 'Ibrahim Shehu Bala', 'candidate', '[]', NOW(), NOW(), 1),
        ('fce028a3-3ef7-43de-8cec-a14fca7ff5d5', 'seed-candidate-096', 'abbaraees@gmail.com', 'Muhammad Lawal', 'candidate', '[]', NOW(), NOW(), 1),
        ('a8baca21-2e97-4947-965d-e02aeefbdfd2', 'seed-candidate-097', 'ukohudombo@gmail.com', 'UKOH OKON UDOMBO', 'candidate', '[]', NOW(), NOW(), 1),
        ('7f527722-ee5b-4def-9c09-0696430b40fa', 'seed-candidate-098', 'patience.dzarma@galaxybackbone.com.ng', 'Patience Richard Dzarma', 'candidate', '[]', NOW(), NOW(), 1),
        ('3806812f-82a1-4f17-a299-b47c7b116df1', 'seed-candidate-099', 'abubakarsaleh1010@gmail.com', 'Saleh Abubakar', 'candidate', '[]', NOW(), NOW(), 1),
        ('2285916a-b52d-4e0f-9a3f-6bb98b226c0d', 'seed-candidate-100', 'adamsagai@outlook.com', 'Adam John Sagai', 'candidate', '[]', NOW(), NOW(), 1),
        ('34e35282-67b2-4201-b271-e1495a2ee842', 'seed-candidate-101', 'akpegi.okponya@galaxybackbone.com.ng', 'Okponya Akpegi', 'candidate', '[]', NOW(), NOW(), 1),
        ('25a95cd2-87c1-4ad6-b5a8-0fba9b9f5436', 'seed-candidate-102', 'ikenna.abel0456@gmail.com', 'Abel Ikenna Ugwu', 'candidate', '[]', NOW(), NOW(), 1),
        ('e5380d10-62de-4c77-89e1-e8aeaddb61fc', 'seed-candidate-103', 'usman.jauro@galaxybackbone.com.ng', 'Usman Abubakar Jauro', 'candidate', '[]', NOW(), NOW(), 1),
        ('f7262e05-9d30-4bd2-a218-3d97e8114998', 'seed-candidate-104', 'savvieraustin@gmail.com', 'Nweke Augustine', 'candidate', '[]', NOW(), NOW(), 1),
        ('aa75fbfd-90ee-4090-9628-9fb8ea2ff844', 'seed-candidate-105', 'aasythe@gmail.com', 'ABUBAKAR AUWALU SIDI', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('bcd74547-f852-42a9-98fa-48a7c82ccab1', 'seed-candidate-106', 'alfred.adajl@galaxybackbone.com', 'Alfred Michael Adaji', 'candidate', '[]', NOW(), NOW(), 1),
        ('de909632-b2ee-46cb-8def-ee72a11e4cd9', 'seed-candidate-107', 'aammani91@gmail.com', 'Abubakar Mukhtar Ammani', 'candidate', '[]', NOW(), NOW(), 1),
        ('67959e1e-c16a-4791-9d0b-7c8031283235', 'seed-candidate-108', 'abbakabir2010@gmail.com', 'Abba kabir Abba', 'candidate', '[]', NOW(), NOW(), 1),
        ('1edc6f03-0558-405a-8f39-969c391a8491', 'seed-candidate-109', 'abdoollahifx@gmail.com', 'ABDULLAHI MUSTAPHA LAWAL', 'candidate', '[]', NOW(), NOW(), 1),
        ('6bbcb7ce-dcaf-4414-947e-704422d0824b', 'seed-candidate-110', 'muhammadsadis@gmail.com', 'Muhammad Sadis Isa', 'candidate', '[]', NOW(), NOW(), 1),
        ('b3600eaa-85dc-4b13-a0e3-b9aecdb365b8', 'seed-candidate-111', 'salisukumo1@gmail.com', 'Salisu Umar', 'candidate', '[]', NOW(), NOW(), 1),
        ('0950a929-2c32-42b3-b671-e9c6b1f10772', 'seed-candidate-112', 'ace.dexigns@gmail.com', 'Aladeloye Joshua', 'candidate', '[]', NOW(), NOW(), 1),
        ('2364001b-f19c-4664-a498-28fc2a3ba49f', 'seed-candidate-113', 'tjbashiribadu@gmail.com', 'Ahmed Bashir Ribadu', 'candidate', '[]', NOW(), NOW(), 1),
        ('ec38a578-f5ae-4402-9789-d475f89e8fa7', 'seed-candidate-114', 'abbahali01@gmail.com', 'Haliru Aliyu Aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('ecf5a9d0-a636-4441-bc62-87cae63673e1', 'seed-candidate-115', 'anasnguroje@gmail.com', 'Anas Yunusa Adamu', 'candidate', '[]', NOW(), NOW(), 1),
        ('4e266e77-c2b9-44bf-b1cb-9f259fc19ecd', 'seed-candidate-116', 'aadamukabeer09@gmail.com', 'ANAS ADAMU KABIR', 'candidate', '[]', NOW(), NOW(), 1),
        ('5d14f5d7-ee31-4a9e-b1ac-0a6b763523e1', 'seed-candidate-117', 'fatybaba1803@gmail.com', 'Fatima Ibrahim baba', 'candidate', '[]', NOW(), NOW(), 1),
        ('ee4ceb54-49fc-41b0-8271-f1e15da91e3e', 'seed-candidate-118', 'udoh.timothy@yahoo.com', 'Udoh Timothy Augustine', 'candidate', '[]', NOW(), NOW(), 1),
        ('3b8b777a-c0ff-4919-82cd-9b7be35ff82b', 'seed-candidate-119', 'aakenewee760@gmail.com', 'ABDULLAHI ABDURRAHMAN', 'candidate', '[]', NOW(), NOW(), 1),
        ('0b4c2c36-78c8-4e0a-a749-a771218caa41', 'seed-candidate-120', 'opeoluwaodanye@gmail.com', 'Opeoluwa Odanye', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('3aea164c-c68f-4730-97fc-5b65a9ae2dbc', 'seed-candidate-121', 'jamilumustapha.m@gmail.com', 'Jamilu Mustapha Mustapha', 'candidate', '[]', NOW(), NOW(), 1),
        ('238b6591-5b8b-4830-b801-2339d95b569f', 'seed-candidate-122', 'najeebumarlawan02@gmail.com', 'Najib Umar Lawan', 'candidate', '[]', NOW(), NOW(), 1),
        ('0c8af1ea-a26b-42b4-85ed-32b882fb68b1', 'seed-candidate-123', 'ebilomaisrael@gmail.com', 'Ebiloma Israel', 'candidate', '[]', NOW(), NOW(), 1),
        ('a9551272-89e3-4a07-86db-2f478eb9e877', 'seed-candidate-124', 'ekongonofiok93@gmail.com', 'Onofiok Ekong', 'candidate', '[]', NOW(), NOW(), 1),
        ('cad9a568-fccf-4c62-b88d-0821803b70b7', 'seed-candidate-125', 'abdurrahmaneedrees@gmail.com', 'ABDURRAHMAN IDRIS', 'candidate', '[]', NOW(), NOW(), 1),
        ('b8aff3a5-4575-41cb-ad96-4ec47998f6fb', 'seed-candidate-126', 'okemgboawaji@gmail.com', 'Mgboawaji-ogak Jonah Oke', 'candidate', '[]', NOW(), NOW(), 1),
        ('16864a7c-25a4-4fa2-8966-43b1289fb224', 'seed-candidate-127', 'hamzahmuhammad247@gmail.com', 'Mohammed Hamzah Kari', 'candidate', '[]', NOW(), NOW(), 1),
        ('c9eecc21-45f4-4cf4-9cca-903df9de8e71', 'seed-candidate-128', 'janetoye235@gmail.com', 'Oyebamiji Janet Temitope', 'candidate', '[]', NOW(), NOW(), 1),
        ('aa6bdad8-3a56-4fa7-8e41-d1f1dcf31c53', 'seed-candidate-129', 'danielelijah17@gmail.com', 'Daniel Elijah Dibal', 'candidate', '[]', NOW(), NOW(), 1),
        ('18636bc1-1e83-4064-b114-5939cdcc5d2e', 'seed-candidate-130', 'chidinmamiriamokereke@gmail.com', 'Chidinma Miriam Okereke', 'candidate', '[]', NOW(), NOW(), 1),
        ('e179c29e-fffe-45a4-8e65-4a3cfa3671e0', 'seed-candidate-131', 'nasiraminu088@gmail.com', 'Nasir Aminu', 'candidate', '[]', NOW(), NOW(), 1),
        ('cf86af1c-c2d5-4715-8fa0-bd56ca4671cb', 'seed-candidate-132', 'dogondaajj@gmail.com', 'Aminu Abdullahi Dogondaji', 'candidate', '[]', NOW(), NOW(), 1),
        ('07f96024-c0d5-4f39-aabc-8f526ce8f983', 'seed-candidate-133', 'tvappa4u@gmail.com', 'Tijjani Tihallo Vappa', 'candidate', '[]', NOW(), NOW(), 1),
        ('ffc8b8be-3782-426e-ba22-d655b401e87c', 'seed-candidate-134', '1greatprestige@gmail.com', 'Aniedi Inyang', 'candidate', '[]', NOW(), NOW(), 1),
        ('9b793db3-9e5c-4870-b2a5-740b33151b9d', 'seed-candidate-135', 'sirferdyekpo@gmail.com', 'Ferdinand Ekpo', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('fdfd07d5-eccb-426f-a23a-cd779e34a00e', 'seed-candidate-136', 'kyariabbas@gmail.com', 'Abbas Kyari', 'candidate', '[]', NOW(), NOW(), 1),
        ('af9818de-534d-4122-99ff-0dfb8ab0bbe2', 'seed-candidate-137', 'abbamuazulm@gmail.com', 'Lawal Muazu', 'candidate', '[]', NOW(), NOW(), 1),
        ('c762764d-3908-443d-b18a-12321642e069', 'seed-candidate-138', 'abbasasulaiman11@gmail.com', 'Abbas Ahmad', 'candidate', '[]', NOW(), NOW(), 1),
        ('f6b042f0-8e06-4dba-8a37-9e39eebfb951', 'seed-candidate-139', 'bonsoirval@gmail.com', 'Njoku Okechukwu Valentine', 'candidate', '[]', NOW(), NOW(), 1),
        ('2acb19d1-2aef-43e0-bb2c-9b36a99a0f39', 'seed-candidate-140', 'ziyaulhaqsurajo@yahoo.com', 'ZIYAU SIRAJO', 'candidate', '[]', NOW(), NOW(), 1),
        ('0c40d51e-4fde-4737-b634-7db215bd9134', 'seed-candidate-141', 'bezerine@hotmail.com', 'Augustine Simon Chimamkpam', 'candidate', '[]', NOW(), NOW(), 1),
        ('2c34d1dc-c7e3-4dc2-bcc6-81d7f64b7972', 'seed-candidate-142', 'basheerremilekun@gmail.com', 'Basheer Remilekun Muftau', 'candidate', '[]', NOW(), NOW(), 1),
        ('43eeb28a-7a3a-4f11-b72c-08541f283e2a', 'seed-candidate-143', 'mcdre1995@gmail.com', 'Arji Christian Chijioke', 'candidate', '[]', NOW(), NOW(), 1),
        ('f1226325-de5e-4beb-a450-3d99257d02ee', 'seed-candidate-144', 'marianaphiare@gmail.com', 'Marian Aphiare', 'candidate', '[]', NOW(), NOW(), 1),
        ('af92ecef-ffaa-4b50-bb60-9ab158a3794a', 'seed-candidate-145', 'terkimbiayana5@gmail.com', 'Ayana Terkimbi Daniel', 'candidate', '[]', NOW(), NOW(), 1),
        ('1d464c28-435a-4f68-97b5-7068e0623be2', 'seed-candidate-146', '1sadiqusman@gmail.com', 'Sadiq Usman', 'candidate', '[]', NOW(), NOW(), 1),
        ('00f35cc3-1353-4ec3-bab5-bba79a9a0400', 'seed-candidate-147', 'fayvhurchristopher@gmail.com', 'Onome Favour Omoegbeleghan', 'candidate', '[]', NOW(), NOW(), 1),
        ('0200c67a-bc9d-4c55-95b9-180a51e9ccde', 'seed-candidate-148', 'abbahussaini123@gmail.com', 'Abba Hussaini', 'candidate', '[]', NOW(), NOW(), 1),
        ('217ea68b-06eb-49f1-a3b7-9563582abe3b', 'seed-candidate-149', 'ijiwadejames@gmail.com', 'Ijiwade James Oluwafemi', 'candidate', '[]', NOW(), NOW(), 1),
        ('6a17880a-02b1-4965-90f0-6df792ff6605', 'seed-candidate-150', 'luckyalade309@gmail.com', 'Lucky Alade', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('7b0e48e7-695a-4910-9d2e-0704c8cbe089', 'seed-candidate-151', 'abikesomoye@gmail.com', 'Doyin Somoye', 'candidate', '[]', NOW(), NOW(), 1),
        ('ea2c6c00-7b1b-40b1-afee-ee33f174c527', 'seed-candidate-152', 'nabilkabirumohammed@gmail.com', 'Mohammed Nabil Abubakar', 'candidate', '[]', NOW(), NOW(), 1),
        ('eb812656-29a5-4c74-a831-79bb31155dd7', 'seed-candidate-153', 'eedrispanti@gmail.com', 'Idris Mohammed Panti', 'candidate', '[]', NOW(), NOW(), 1),
        ('38e43660-4a01-4ae6-a86a-3bd5c2f0d5db', 'seed-candidate-154', 'victor.baka16@gmail.com', 'Victor David Sarkibaka', 'candidate', '[]', NOW(), NOW(), 1),
        ('fbe6d68f-fdad-4a3e-9aed-4c3626b4a1ba', 'seed-candidate-155', 'bobdariddle@gmail.com', 'Jibilla Shadrach Masoyi', 'candidate', '[]', NOW(), NOW(), 1),
        ('f16f44c0-86db-47e1-8be0-19f75c651829', 'seed-candidate-156', 'nafisatfaruk5@mail.com', 'Nafisat Sanusi', 'candidate', '[]', NOW(), NOW(), 1),
        ('2c42fead-a795-4fca-b4f4-80ccb6b85c13', 'seed-candidate-157', 'sjstixx@gmail.com', 'Samuel Joseph', 'candidate', '[]', NOW(), NOW(), 1),
        ('964b5eb3-6907-4c0d-9cfe-99c40c10a552', 'seed-candidate-158', 'kabirmuhammad299@gmail.com', 'Mohammed saad', 'candidate', '[]', NOW(), NOW(), 1),
        ('c383e160-c6cf-4a4f-a2b3-5805653997b4', 'seed-candidate-159', 'abubakargimba62@gmail.com', 'Abubakar Yau Gimba', 'candidate', '[]', NOW(), NOW(), 1),
        ('1dfcf4a0-d8cb-46b6-b11b-7bd7e7486976', 'seed-candidate-160', 'aabdulkadir199@gmail.com', 'Abdulkadir abubakar', 'candidate', '[]', NOW(), NOW(), 1),
        ('6416018b-9637-4737-9b68-303fe628d711', 'seed-candidate-161', 'abbasmuhammad959.am@gmail.com', 'Abbas Muhammad', 'candidate', '[]', NOW(), NOW(), 1),
        ('181773e8-7158-43ff-ad6b-4cc54db2a86b', 'seed-candidate-162', 'aliyu.saidu8438@yahoo.com', 'Aliyu Saidu', 'candidate', '[]', NOW(), NOW(), 1),
        ('eb74e2e7-1f9a-4f3e-a965-6f595e49f7f9', 'seed-candidate-163', 'fadasgazah@gmail.com', 'Shehu Isah', 'candidate', '[]', NOW(), NOW(), 1),
        ('b04a30e3-a26b-4d07-bd3c-09f41421dda3', 'seed-candidate-164', 'abbabebeji01@gmail.com', 'Musa Bashir Bebeji', 'candidate', '[]', NOW(), NOW(), 1),
        ('51062906-5c18-426b-890c-2dacaef0330e', 'seed-candidate-165', 'aaliyu30@gmail.com', 'Abdullahi Abubakar Aliyu', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('bb662b60-1da2-438f-90d4-e51f9e70bd87', 'seed-candidate-166', 'hayatu4islam@yahoo.com', 'Hayatullahi Bolaji Adeyemo', 'candidate', '[]', NOW(), NOW(), 1),
        ('1e59ff9f-0b91-4f83-9f25-cb665d021094', 'seed-candidate-167', 'ekanem.nseabasi@gmail.com', 'Nseabasi Emmanuel Ekanem', 'candidate', '[]', NOW(), NOW(), 1),
        ('dd564226-50e4-43e1-b153-fc1986b4e701', 'seed-candidate-168', 'abbahusumm@gmail.com', 'Usman Aliyu', 'candidate', '[]', NOW(), NOW(), 1),
        ('05a9e57b-9bd3-45fb-a8cb-a249a22b1787', 'seed-candidate-169', 'aaakanoglobal@gmail.com', 'Abdulmalik Abdurrahman Abdulkadir', 'candidate', '[]', NOW(), NOW(), 1),
        ('08c4794a-5bd9-4f20-8858-28b850476048', 'seed-candidate-170', 'aminuamfax@gmail.com', 'AMINU ABDULLAHI CHIROMARI', 'candidate', '[]', NOW(), NOW(), 1),
        ('46bc09cc-621f-4a30-ba43-bfa7886208df', 'seed-candidate-171', 'antyonyinye@gmail.com', 'Onyinye Grace Edeh', 'candidate', '[]', NOW(), NOW(), 1),
        ('1cd30c84-32e3-408d-ba5f-360ea4635bb9', 'seed-candidate-172', 'mashudetudaye@gmail.com', 'Mashud Siyaka Etudaye', 'candidate', '[]', NOW(), NOW(), 1),
        ('02da81da-0d93-48c5-9fdf-c77b1b869716', 'seed-candidate-173', 'alkebulantech@gmail.com', 'CALEB ADEKUNLE', 'candidate', '[]', NOW(), NOW(), 1),
        ('fc813c61-3e22-44a2-816b-96a670f33c90', 'seed-candidate-174', 'manirutambuwal@gmail.com', 'Maniru Malami Umar', 'candidate', '[]', NOW(), NOW(), 1),
        ('4d2e8235-05d4-4859-9568-15f1cf29cabd', 'seed-candidate-175', 'musanesta@gmail.com', 'MUSA SHUAIBU', 'candidate', '[]', NOW(), NOW(), 1),
        ('b0ca4f40-f9ab-4b2b-9325-c8523d24b019', 'seed-candidate-176', 'lamido1419@gmail.com', 'Usman Dahiru Lamido', 'candidate', '[]', NOW(), NOW(), 1),
        ('adc6b835-632b-4f71-9db9-0d667aea1ebe', 'seed-candidate-177', 'yusuf.suleiman@localpathways.org', 'Yusuf Suleiman', 'candidate', '[]', NOW(), NOW(), 1),
        ('2b28b82c-ceeb-442a-bc43-c747724bfc92', 'seed-candidate-178', 'ebilomaisrael@gmail.com.com', 'Ebiloma Israel', 'candidate', '[]', NOW(), NOW(), 1),
        ('d6ec0661-405a-4ac8-a45e-d7e664cfdd0f', 'seed-candidate-179', 'abdulhafizbashir@gmail.com', 'Hafiz Bashir', 'candidate', '[]', NOW(), NOW(), 1),
        ('aa21098e-2c87-4d69-8d10-3133adf990ee', 'seed-candidate-180', 'aagwani1@gmail.com', 'Alhaji Abdullahi Gwani', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO talent_users (id, external_user_id, email, display_name, user_type, permissions, created_at, updated_at, version)
      VALUES
        ('086aa916-b5c2-4536-ab00-64e7028fb17a', 'seed-candidate-181', 'abbaefixxy@gmail.com', 'ABBA MUHAMMAD INUWA', 'candidate', '[]', NOW(), NOW(), 1),
        ('9e4e5fcf-e5ae-4502-a0cc-6d1d49e76430', 'seed-candidate-182', 'aliushuaib7@gmail.com', 'Aliyu Shuaib Omeiza', 'candidate', '[]', NOW(), NOW(), 1),
        ('4ed53759-7f79-4b8d-b182-e634c280fe9b', 'seed-candidate-183', 'aadanadda@gmail.com', 'ABDURRAHMAN ABUBAKAR', 'candidate', '[]', NOW(), NOW(), 1),
        ('e3d7aedf-7db9-4a33-b049-b079c116ed87', 'seed-candidate-184', 'isaladan88@gmail.com', 'Isah Ashafa Ladan', 'candidate', '[]', NOW(), NOW(), 1),
        ('7bcdf097-6fe8-40e7-85ba-a12b3302b093', 'seed-candidate-185', 'abbasalehpaga@gmail.com', 'Abbasalehpaga', 'candidate', '[]', NOW(), NOW(), 1),
        ('294cb98d-c644-455a-bfcd-062fff4183ec', 'seed-candidate-186', 'engr.ajibayo@yahoo.com', 'AJIBAYO TEMITOPE JOHN', 'candidate', '[]', NOW(), NOW(), 1),
        ('22493d49-aeb4-41f3-8412-9449624ff0fc', 'seed-candidate-187', 'basheerbeemer@gmail.com', 'Bashir Ismail Musa', 'candidate', '[]', NOW(), NOW(), 1),
        ('cb7299e0-3c50-45af-b161-8c7f9481afef', 'seed-candidate-188', 'amirubashari@gmail.com', 'Amiru Bashari', 'candidate', '[]', NOW(), NOW(), 1),
        ('42c48a26-dec9-4e83-87eb-08fad1273cb1', 'seed-candidate-189', 'abbabashir04@gmail.com', 'Abba Bashir', 'candidate', '[]', NOW(), NOW(), 1),
        ('3a6255a3-774b-49de-8326-352a6b5ec6f9', 'seed-candidate-190', 'jobgabrielabdul@gmail.com', 'Job Gabriel Abdul', 'candidate', '[]', NOW(), NOW(), 1),
        ('729f3871-85a2-455b-be0c-ecdc8212e579', 'seed-candidate-191', 'aliyuaa005@gmail.com', 'Aliyu Abdullahi', 'candidate', '[]', NOW(), NOW(), 1),
        ('b47fcf91-97dc-4ab9-b872-a6be58b579b5', 'seed-candidate-192', 'faitcyobaje@gmail.com', 'Faith Obaje', 'candidate', '[]', NOW(), NOW(), 1),
        ('ef86dd6d-31cb-4703-a1c8-1fbf4e218cc5', 'seed-candidate-193', 'hauwa.aminu@outlook.com', 'Hauwa Ibrahim Aminu', 'candidate', '[]', NOW(), NOW(), 1),
        ('61daee29-79ce-4eba-8c9b-45100840aa23', 'seed-candidate-194', 'adabas04070@gmail.com', 'Adnan Shehu', 'candidate', '[]', NOW(), NOW(), 1)
      ON CONFLICT (external_user_id) DO NOTHING`);

    // ─── ROLES ──────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', '0a857d1c-c581-407a-be92-12d291227640', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3242df13-09d9-4b73-8393-09035718dd8b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '5f59e8e4-61ba-44cc-8604-60ea07ff0d43', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ca73024e-8674-4c32-bd42-2d9f9e13dfea', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '76c49df4-e6f4-4f44-941b-40defd35474e', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3df62a90-612a-4b0e-944e-b9f42ea46229', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2a59fca8-ec6b-477b-b0d5-bb5fc2c572b6', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '97aa5a08-156c-4a8a-bb80-4b983eb2eb0f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c49b1eac-faf3-42d9-97bd-cb79c39aa91c', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1b33c6df-e79d-404d-93e2-833a788ffb49', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b220ac18-156f-412d-a98c-13db2cc70e1b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ac899d18-445b-4aac-b1a9-74f71c1450b5', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '5dd9b4db-addc-4568-952a-c1eb30b35bec', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '97431f61-64c5-41cc-9642-c1cc294e0743', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f22a64d3-6f3c-4e96-9a71-525f050356f6', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', '5a87fcc9-835b-4d82-a3c4-c391505a5282', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '8ec21af7-5898-45b8-8e7e-d336b1854688', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '33531039-7748-4162-9f8e-3aef92d41f29', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '7216c13f-37b1-400d-8a72-dc313847709f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c7b4f1d4-6449-486d-95a1-251985c47167', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f57b4f60-9e2e-45d1-979e-dd8c9f874d5d', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '768e9867-e924-4827-a5fd-388cc6eec935', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'a9cdcca1-197b-4e12-89d0-f804ce631478', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '828eea7c-8bdd-4e82-9ef7-db1ff6e9245d', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '8318d716-8f14-4ab4-9c5c-e71e5d3c5c73', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2198b8ee-189f-4792-adaa-612eaaecdf28', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'bd334af7-b215-4021-bd37-bb1d2120362a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '993bb92a-5e96-4342-b10b-5acd7c90e8f2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4fa76119-9050-4583-9c64-f4fa3a18f98c', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '11c552b8-37fa-4645-9882-1af2e78ead31', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'e55c37db-84fd-4403-b5be-7c66bf31c2b0', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2dd3b239-adac-439e-9caf-6d1050a655fc', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '5b4a8a45-72b3-4cbd-af20-b2785b5d00eb', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '9a6d5de1-4f05-4e31-a45c-7d58b04a6f7b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '87916707-9093-4f4f-972b-a1f027ba2d3a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'd566c322-84ab-401a-a486-b1f5d4ad4bc9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c7a065ab-45e8-4e6b-98e7-4e72397cdcf2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ce2e01d7-a7b4-40cb-9293-bfb2ebce6d01', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4e4fd58f-dc9a-4e73-8e8e-ddf39b0d6091', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'a3536a70-9055-49ae-a7aa-6adf065b9c29', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'd2e7b6cd-e32e-4799-92a8-3cd170386c39', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f7bf7981-73ed-42a9-91c7-11a6fa4da5d4', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '983ce9fa-6ec6-46e5-9837-7dbdcd8a89b9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '968b20a1-9646-4546-be16-e71bee884acf', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '894e27b1-b5bb-4830-9151-2ca1d2277446', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', '3ad6fdbb-f673-4d7b-897d-868de32fc379', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b209da5a-c0ff-4910-b045-5e5f9706c616', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '50b5caf4-a82d-4dce-9c3e-ece6a35d99b0', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '0360b4a5-a3b0-422b-b5c9-686a23b1a61f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f9bfd5ae-7c6b-44a7-a6b9-0c67bb95690d', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ac7e1664-68d7-4d80-a64c-becf53774f92', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '91ea880c-563f-47a7-a6d5-85fb043c4482', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '24ed285c-cc31-49aa-8989-dfef9c867d8a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'd14c2a19-3239-4a27-8d0b-38f6a8e0d605', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f775a244-4431-4c5b-981b-492b73bb3b46', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '8e45c5e5-1b2c-4fe2-b96d-36c08192c078', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f5d230ba-7043-42c6-882d-d6f6f76c4b66', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '257d5333-e305-49c0-8140-b16fe8c70e7a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1d94ddc5-4ec1-460d-be6b-e3f3dc582273', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c5dfae12-5c2d-4c2e-ae8a-680d8a49bbe2', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'fa21adb6-391d-4dd1-9913-ac3d0359d438', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '29ba6b20-50b9-4f00-9a02-340883bb2a1e', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ebafcbd6-b723-48d1-aba0-b2c0eed9400a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3ca3c5a4-38b0-4041-b40a-578f4ff9e0d2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'dd4fd665-dd32-44ad-ac18-fd0311ced12f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3a7af04e-7f72-4721-b660-de16ac90d1f1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'db116671-8144-4dae-ac82-67bfd7022c30', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'adceab09-7b93-4a81-a773-2fe19e16ac58', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'e70f6a59-88de-428d-97f7-f18093072753', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b6b1fc6b-6b42-4f79-bb86-9222c3abad0d', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f8e8b3fc-297e-43ea-85ad-1f5a7014526b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4921240d-4561-4073-b01c-6a69df8e4be2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '737b227c-da35-42c2-8f7f-d51e3d8ec4c9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '61a25f62-a27d-4eec-b459-3df43763b675', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '049f62c6-e9da-4bac-ac36-bc003fed5d7c', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'a0c604c7-9bd4-462f-a666-897c36468c5d', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f80db231-2271-4386-ab59-d0c5e6350570', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ea3788ef-da37-4426-b125-9684c565f095', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b1587f0c-11ee-4110-a483-c73e06616e35', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '5ed893df-0938-4fae-889c-9a437d56c5d4', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b54ffe2f-3db7-47a5-9de1-19bbc14a75ef', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '97ccb2df-1f62-4b0c-8dac-733338a58721', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '320dfc4a-1929-44d5-a655-c692125b975e', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '8eb89e3f-8103-4d5e-8b0a-b10d5320d4a5', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '539b9239-e92d-4ce5-83a5-a50ee468cbf1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4f58e507-10ca-44a0-bbbd-92db97a29bc9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '53dc7622-a0b2-4d77-ab18-3dd4dc46af83', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ac134757-ec66-4c58-88f9-6f98197134c4', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '20631b22-df4f-4aab-9774-7ed6a10b53ea', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4cd0a769-9178-4b34-af5f-a136dc44694a', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'ca01be65-bec4-4119-bf14-1eafa1f271b4', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '77033cb8-70be-46bd-a071-508d8212f4de', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '8d20a25f-8ae8-49e0-9dc4-4ad2aa94a684', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '39155e8b-3397-45ed-b77c-26de34876f05', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '139b07a0-8a60-419e-8751-6443074cf609', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'fce028a3-3ef7-43de-8cec-a14fca7ff5d5', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'a8baca21-2e97-4947-965d-e02aeefbdfd2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '7f527722-ee5b-4def-9c09-0696430b40fa', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3806812f-82a1-4f17-a299-b47c7b116df1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2285916a-b52d-4e0f-9a3f-6bb98b226c0d', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '34e35282-67b2-4201-b271-e1495a2ee842', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '25a95cd2-87c1-4ad6-b5a8-0fba9b9f5436', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'e5380d10-62de-4c77-89e1-e8aeaddb61fc', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f7262e05-9d30-4bd2-a218-3d97e8114998', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'aa75fbfd-90ee-4090-9628-9fb8ea2ff844', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'bcd74547-f852-42a9-98fa-48a7c82ccab1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'de909632-b2ee-46cb-8def-ee72a11e4cd9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '67959e1e-c16a-4791-9d0b-7c8031283235', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1edc6f03-0558-405a-8f39-969c391a8491', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '6bbcb7ce-dcaf-4414-947e-704422d0824b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b3600eaa-85dc-4b13-a0e3-b9aecdb365b8', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '0950a929-2c32-42b3-b671-e9c6b1f10772', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2364001b-f19c-4664-a498-28fc2a3ba49f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ec38a578-f5ae-4402-9789-d475f89e8fa7', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ecf5a9d0-a636-4441-bc62-87cae63673e1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4e266e77-c2b9-44bf-b1cb-9f259fc19ecd', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '5d14f5d7-ee31-4a9e-b1ac-0a6b763523e1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ee4ceb54-49fc-41b0-8271-f1e15da91e3e', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3b8b777a-c0ff-4919-82cd-9b7be35ff82b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '0b4c2c36-78c8-4e0a-a749-a771218caa41', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', '3aea164c-c68f-4730-97fc-5b65a9ae2dbc', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '238b6591-5b8b-4830-b801-2339d95b569f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '0c8af1ea-a26b-42b4-85ed-32b882fb68b1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'a9551272-89e3-4a07-86db-2f478eb9e877', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'cad9a568-fccf-4c62-b88d-0821803b70b7', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b8aff3a5-4575-41cb-ad96-4ec47998f6fb', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '16864a7c-25a4-4fa2-8966-43b1289fb224', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c9eecc21-45f4-4cf4-9cca-903df9de8e71', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'aa6bdad8-3a56-4fa7-8e41-d1f1dcf31c53', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '18636bc1-1e83-4064-b114-5939cdcc5d2e', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'e179c29e-fffe-45a4-8e65-4a3cfa3671e0', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'cf86af1c-c2d5-4715-8fa0-bd56ca4671cb', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '07f96024-c0d5-4f39-aabc-8f526ce8f983', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ffc8b8be-3782-426e-ba22-d655b401e87c', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '9b793db3-9e5c-4870-b2a5-740b33151b9d', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'fdfd07d5-eccb-426f-a23a-cd779e34a00e', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'af9818de-534d-4122-99ff-0dfb8ab0bbe2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c762764d-3908-443d-b18a-12321642e069', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f6b042f0-8e06-4dba-8a37-9e39eebfb951', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2acb19d1-2aef-43e0-bb2c-9b36a99a0f39', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '0c40d51e-4fde-4737-b634-7db215bd9134', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2c34d1dc-c7e3-4dc2-bcc6-81d7f64b7972', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '43eeb28a-7a3a-4f11-b72c-08541f283e2a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f1226325-de5e-4beb-a450-3d99257d02ee', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'af92ecef-ffaa-4b50-bb60-9ab158a3794a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1d464c28-435a-4f68-97b5-7068e0623be2', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '00f35cc3-1353-4ec3-bab5-bba79a9a0400', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '0200c67a-bc9d-4c55-95b9-180a51e9ccde', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '217ea68b-06eb-49f1-a3b7-9563582abe3b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '6a17880a-02b1-4965-90f0-6df792ff6605', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', '7b0e48e7-695a-4910-9d2e-0704c8cbe089', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ea2c6c00-7b1b-40b1-afee-ee33f174c527', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'eb812656-29a5-4c74-a831-79bb31155dd7', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '38e43660-4a01-4ae6-a86a-3bd5c2f0d5db', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'fbe6d68f-fdad-4a3e-9aed-4c3626b4a1ba', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'f16f44c0-86db-47e1-8be0-19f75c651829', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2c42fead-a795-4fca-b4f4-80ccb6b85c13', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '964b5eb3-6907-4c0d-9cfe-99c40c10a552', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'c383e160-c6cf-4a4f-a2b3-5805653997b4', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1dfcf4a0-d8cb-46b6-b11b-7bd7e7486976', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '6416018b-9637-4737-9b68-303fe628d711', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '181773e8-7158-43ff-ad6b-4cc54db2a86b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'eb74e2e7-1f9a-4f3e-a965-6f595e49f7f9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b04a30e3-a26b-4d07-bd3c-09f41421dda3', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '51062906-5c18-426b-890c-2dacaef0330e', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', 'bb662b60-1da2-438f-90d4-e51f9e70bd87', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1e59ff9f-0b91-4f83-9f25-cb665d021094', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'dd564226-50e4-43e1-b153-fc1986b4e701', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '05a9e57b-9bd3-45fb-a8cb-a249a22b1787', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '08c4794a-5bd9-4f20-8858-28b850476048', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '46bc09cc-621f-4a30-ba43-bfa7886208df', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '1cd30c84-32e3-408d-ba5f-360ea4635bb9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '02da81da-0d93-48c5-9fdf-c77b1b869716', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'fc813c61-3e22-44a2-816b-96a670f33c90', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4d2e8235-05d4-4859-9568-15f1cf29cabd', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b0ca4f40-f9ab-4b2b-9325-c8523d24b019', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'adc6b835-632b-4f71-9db9-0d667aea1ebe', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '2b28b82c-ceeb-442a-bc43-c747724bfc92', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'd6ec0661-405a-4ac8-a45e-d7e664cfdd0f', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'aa21098e-2c87-4d69-8d10-3133adf990ee', NOW(), NOW(), NOW(), 1)
`);

    await queryRunner.query(`
      INSERT INTO talent_user_roles (id, role, user_id, assigned_at, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'candidate', '086aa916-b5c2-4536-ab00-64e7028fb17a', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '9e4e5fcf-e5ae-4502-a0cc-6d1d49e76430', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '4ed53759-7f79-4b8d-b182-e634c280fe9b', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'e3d7aedf-7db9-4a33-b049-b079c116ed87', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '7bcdf097-6fe8-40e7-85ba-a12b3302b093', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '294cb98d-c644-455a-bfcd-062fff4183ec', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '22493d49-aeb4-41f3-8412-9449624ff0fc', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'cb7299e0-3c50-45af-b161-8c7f9481afef', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '42c48a26-dec9-4e83-87eb-08fad1273cb1', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '3a6255a3-774b-49de-8326-352a6b5ec6f9', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '729f3871-85a2-455b-be0c-ecdc8212e579', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'b47fcf91-97dc-4ab9-b872-a6be58b579b5', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', 'ef86dd6d-31cb-4703-a1c8-1fbf4e218cc5', NOW(), NOW(), NOW(), 1),
        (gen_random_uuid(), 'candidate', '61daee29-79ce-4eba-8c9b-45100840aa23', NOW(), NOW(), NOW(), 1)
`);

    // ─── CANDIDATE PROFILES ─────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '444fee23-8e4e-44eb-8c8f-e691af8dd188', '0a857d1c-c581-407a-be92-12d291227640',
          'Lukman Idowu Lamid', 'lukman-idowu-lamid',
          'Nasarawa', 'Nigeria', 'Africa/Lagos',
          '08035716467', 'lukmanlamid@yahoo.com',
          NULL, 'Cisco Engineering,Pmp', NULL, NULL,
          NULL, NULL, NULL,
          NULL, NULL,
          NULL, NULL,
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ebd6f5c7-92be-4ea3-9b99-34a278d94e1f', '3242df13-09d9-4b73-8393-09035718dd8b',
          'Garzali Garo Ahmad', 'garzali-garo-ahmad',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07066492821', 'muhdgazzali01@gmail.com',
          5, 'Node.js,React,Next.js,TypeScript,Flutter,React Native,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,OAuth2/OIDC,Postman', 'TypeScript,Python', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://github.com/garoweb262', 'https://linkedin.com/in/garosarkie', 'https://garoweb.vercel.app',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd8793e93-c5d6-462b-800d-42e379a66c88', '5f59e8e4-61ba-44cc-8604-60ea07ff0d43',
          'Abdullahi Nasir', 'abdullahi-nasir',
          NULL, 'Nigeria', 'Africa/Lagos',
          '+2348174985976', 'devabdulnas@gmail.com',
          7, 'Node.js,React,TypeScript,Flutter,LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,OAuth2/OIDC,Postman,Microsevice,jenkins.', 'Node.js,TypeScript', 'APIs (REST)',
          'https://github.com/abdallahmnas', 'https://linkedin.com/in/abdallahmnas', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0e3b1d43-e018-49a5-9e04-c360fde12602', 'ca73024e-8674-4c32-bd42-2d9f9e13dfea',
          'Mohammad Bashir Tukur', 'mohammad-bashir-tukur',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '+2347062920988', 'tukurmohammad8@gmail.com',
          4, 'Node.js,Python,React,Next.js,TypeScript,Flutter,LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,OAuth2/OIDC,Cypress,Postman', 'Python,TypeScript', 'Design systems,Component libraries,State management',
          'https://github.com/MohammadBT240', 'https://www.linkedin.com/in/mohammad-bashir-7545a3212/?skipRedirect=true', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'cfb1ea10-9704-47f4-aae9-73bc16141cbc', '76c49df4-e6f4-4f44-941b-40defd35474e',
          'Umar Adamu', 'umar-adamu',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08140099331', 'umaralfaruq02@gmail.com',
          8, 'Go,Java,Python,Rust,React,Flutter,Python (Data),Docker,Kubernetes,Terraform,PostgreSQL,Redis,OAuth2/OIDC,Postman,JUnit', 'Go,Java,Python,Rust', NULL,
          'https://github.com/faruq-alkalo', 'https://www.linkedin.com/in/faruq-alkali/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ef92f3b2-0997-4801-8b15-21ef92185fcd', '3df62a90-612a-4b0e-944e-b9f42ea46229',
          'Aisha Muhammad Ali', 'aisha-muhammad-ali',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '07030334384', 'alikumo04@gmail.com',
          6, 'Java,.NET,React,Next.js,React Native,ML Ops,LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,Vulnerability Mgmt,Postman,Oracle RDBMS,AWS,Google Cloud*', '.NET,Java', 'APIs (REST)',
          'https://github.com/AishaAli04', 'https://www.linkedin.com/in/aisha-muhammad-ali-192474105?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b6122c81-d6b5-4079-a17d-84a376210fa2', '2a59fca8-ec6b-477b-b0d5-bb5fc2c572b6',
          'Wamayi Ismaila Garki', 'wamayi-ismaila-garki',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08183379225', 'wamayiismaila3@gmail.com',
          3, 'Java,Python,React,TypeScript,Flutter,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,Vulnerability Mgmt,SIEM/SOC,Playwright', 'Java,Python,TypeScript', 'Data pipelines (e.g.,Spark/Airflow)',
          'https://github.com/wamayiismaila3-del', 'https://www.linkedin.com/in/wamayi-ismaila', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'db728872-67f5-4ebd-b6bf-768b2e68de9d', '97aa5a08-156c-4a8a-bb80-4b983eb2eb0f',
          'Ibrahim Ismail Rafindadi', 'ibrahim-ismail-rafindadi',
          'Lagos State', 'Nigeria', 'Africa/Lagos',
          '08146985560', 'iiirafindadi@gmail.com',
          12, 'Python,Rust,TypeScript,Swift,Airflow,ML Ops,GitHub Actions,Elastic,Vulnerability Mgmt,Cypress', 'Python,Rust,TypeScript,Swift', NULL,
          'https://github.com/iiirafindadi', 'https://www.linkedin.com/in/ibrahim-ismail-rafindadi-9364a5143', NULL,
          'two_three_months', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '720597da-446c-4713-9033-bdf3fe1b9161', 'c49b1eac-faf3-42d9-97bd-cb79c39aa91c',
          'Abdulbasit Adamu', 'abdulbasit-adamu',
          'Dakwa', 'Nigeria', 'Africa/Lagos',
          '07037696952', 'abdulbasitadamu3@gmail.com',
          5, 'Python,React,Swift,Python (Data),GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Playwright,Power BI,Excel,Tableau', 'Python,Swift', 'Data pipelines (e.g.,Spark/Airflow)',
          'https://github.com/dashboard', 'https://www.linkedin.com/in/adamu-abdulbasit-8b2823225?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd12bc485-e313-472f-89a1-7bc85702be3f', '1b33c6df-e79d-404d-93e2-833a788ffb49',
          'Mahmoud Muhammad Sani', 'mahmoud-muhammad-sani',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08105003394', 'sanimahmoud10@gmail.com',
          3, 'Node.js,Python,Next.js,Vue,TypeScript,Flutter,React Native,Python (Data),LLM Apps,Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,OAuth2/OIDC,Postman,Communication Skills
Complex Problem Solving 
Interpersonal Skills', 'Python,TypeScript', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://github.com/develmahmoud', 'https://www.linkedin.com/in/mahmoud-muhammad-sani-680752223/', 'https://devmahmoud-portfolio.vercel.app/',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '9b301a27-30df-4816-89a5-b86b985fab1a', 'b220ac18-156f-412d-a98c-13db2cc70e1b',
          'Ademola Sodiq kongi', 'ademola-sodiq-kongi',
          'lagos', 'Nigeria', 'Africa/Lagos',
          '09079351822', 'kongidehmmorlarh@gmail.com',
          3, 'Java,Python,React,Flutter,Python (Data),Kubernetes,GitHub Actions,MySQL,Vulnerability Mgmt,SIEM/SOC,Playwright,Go test', 'Java,Python', NULL,
          'https://github.com/Dehmmorlarh4/Demson.git', 'https://www.linkedin.com/in/ademola-kongi-b64070100?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BO%2F0J6SPdQH%2Bozr5BHSlPeg%3D%3D', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c3edbe27-fd03-4fe4-a9f2-32277c0f51f4', 'ac899d18-445b-4aac-b1a9-74f71c1450b5',
          'LARABA SULEH', 'laraba-suleh',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08060937361', 'sulehlaraba@gmail.com',
          9, 'Go,React,Flutter,LLM Apps,Docker,MySQL,OAuth2/OIDC,Cypress', 'Go', NULL,
          'https://github.com/sulehal', 'https://www.linkedin.com/in/kweenlaraba', NULL,
          'two_three_months', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '363c776c-3121-42d6-8fa8-e5caf1afd890', '5dd9b4db-addc-4568-952a-c1eb30b35bec',
          'Mike Michael', 'mike-michael',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '07060845087', 'michaelmike232@gmail.com',
          3, 'Node.js,Python,React,Vue,React Native,Python (Data),ML Ops,Kubernetes,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Postman', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents)',
          'https://github.com/Myckei-Myc', 'https://www.linkedin.com/in/mike-michael-17202a1b0', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '67f032dd-0584-4d5b-9cef-1619bbda1faa', '97431f61-64c5-41cc-9642-c1cc294e0743',
          'OLASUPO Azeez Olawale', 'olasupo-azeez-olawale',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '08078724160', 'olasupoazeezolawale@gmail.com',
          2, 'Python,React,React Native,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Go test,Data Analysis', 'Python', 'LLM Apps (RAG/Agents)',
          'https://github.com/paragon-tech001', 'https://www.linkedin.com/in/olasupo-azeez/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f524af35-ebfb-4fdf-9e07-c4b6bd3c3db5', 'f22a64d3-6f3c-4e96-9a71-525f050356f6',
          'Abdulkarim Salisu', 'abdulkarim-salisu',
          'Jos', 'Nigeria', 'Africa/Lagos',
          '08132238919', 'saliskhaan@gmail.com',
          2, 'Node.js,Python,React,Next.js,Flutter,Python (Data),Docker,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Postman', 'Python', NULL,
          'https://github.com/saliskhaan', 'https://www.linkedin.com/in/saliskhaan/', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          'aa61dc74-952d-4a37-b97f-2456b6ab408d', '5a87fcc9-835b-4d82-a3c4-c391505a5282',
          'Abdulrahman Abubakar', 'abdulrahman-abubakar',
          'Katsina', 'Nigeria', 'Africa/Lagos',
          '07033088648', 'aafuntuwa99@gmail.com',
          5, 'Go,Java,Rust,React,Next.js,TypeScript,Flutter,React Native,Swift,Spark,Airflow,Docker,Helm,Redis,Elastic,OAuth2/OIDC,Vulnerability Mgmt,Playwright,Cypress,Postman,Go test', 'Go,Java,Rust,TypeScript,Swift', NULL,
          'https://github.com/aafuntuwa?tab=repositories', 'https://www.linkedin.com/in/abdulrahman-abubakar-1b48a125a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '328420dd-3319-4263-99ac-d627b56e7cd5', '8ec21af7-5898-45b8-8e7e-d336b1854688',
          'Nafisat Sanusi', 'nafisat-sanusi',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '08035622282', 'nafisatfaruk5@gmail.com',
          5, 'Node.js,Java,.NET,Python,React,Next.js,TypeScript,React Native,Python (Data),LLM Apps,Docker,GitHub Actions,MySQL,OAuth2/OIDC,Playwright,Cypress,Postman', 'Java,Python,TypeScript', 'APIs (REST),gRPC,Concurrency patterns,Performance tuning',
          'https://github.com/phyya', 'https://www.linkedin.com/in/nafisat-sanusi', 'https://nafisat-sanusi.vercel.app',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b05a22f5-bc30-4db8-a19f-062467891bfe', '33531039-7748-4162-9f8e-3aef92d41f29',
          'Abbas Muhammad Shuwa', 'abbas-muhammad-shuwa',
          'Maiduguri', 'Nigeria', 'Africa/Lagos',
          '08062265769', 'abbasmuhammadshuwa@gmail.com',
          5, 'Java,.NET,Python,React,TypeScript,Flutter,Swift,Python (Data),Spark,Airflow,Docker,GitHub Actions,PostgreSQL,MySQL,Elastic,OAuth2/OIDC,Playwright,Go test', 'Java,Python,TypeScript,Swift', 'APIs (REST),Concurrency patterns',
          'https://github.com/abbasmuhammdshuwa', 'https://www.linkedin.com/in/abbas-muhammad-shuwa-010a71144', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c40fe1d0-521a-493d-bf04-bf2007682457', '7216c13f-37b1-400d-8a72-dc313847709f',
          'Yarima Adamu Babali', 'yarima-adamu-babali',
          'Plateau State', 'Nigeria', 'Africa/Lagos',
          '08068409438', 'ybabali16@gmail.com',
          8, 'Python,Next.js,Flutter,Kotlin,Python (Data),LLM Apps,Docker,Kubernetes,GitHub Actions,MySQL,OAuth2/OIDC,Vulnerability Mgmt,SIEM/SOC,Cypress', 'Python,Kotlin', NULL,
          'http://www.github.com/Bleeyarima', 'https://www.linkedin.com/in/babali-yarima-2516022a1?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '66f67354-8da6-4c02-8bd5-2e8645db3b95', 'c7b4f1d4-6449-486d-95a1-251985c47167',
          'Chukwuemeka Edwin Nnadi', 'chukwuemeka-edwin-nnadi',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08033098716', 'enakenergy@gmail.com',
          7, 'Python,Next.js,Swift,Python (Data),GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Vulnerability Mgmt,Playwright', 'Python,Swift', NULL,
          'https://github.com/Chukwuemeka2010', 'https://www.linkedin.com/in/chukwuemeka-nnadi-pmp-932b66376', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b0fd0ee1-8e2a-452f-a39b-5ff10dd40701', 'f57b4f60-9e2e-45d1-979e-dd8c9f874d5d',
          'Abubakar Aliyu', 'abubakar-aliyu',
          '4:17', 'Nigeria', 'Africa/Lagos',
          '07065430504', 'aaliyu492@gmail.com',
          4, 'Node.js,Python,React,Next.js,TypeScript,Flutter,Kotlin,Swift,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Postman,Go test', 'Python,TypeScript,Kotlin,Swift', 'Performance tuning',
          'https://github.com/Abuamatullah', 'https://www.linkedin.com/in/abubakar-aliyu-84914817a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd7f15eab-fa38-4cbf-927e-f653e92134cd', '768e9867-e924-4827-a5fd-388cc6eec935',
          'Shehu Awudu Samnujoma', 'shehu-awudu-samnujoma',
          NULL, 'Nigeria', 'Africa/Lagos',
          '+2347031943007', 'ssawudu@gmail.com',
          3, 'Python,TypeScript,Swift,Python (Data),Terraform,MySQL,SIEM/SOC,Cypress', 'Python,TypeScript,Swift', NULL,
          'https://github.com/Makarixx', 'https://www.linkedin.com/in/sam-nujoma-awudu-b7825689?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '08:00', '16:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '354d56bf-79b9-46ca-a320-e459b282d9cf', 'a9cdcca1-197b-4e12-89d0-f804ce631478',
          'Jabir Iliyasu', 'jabir-iliyasu',
          'Sokoto state Nigeria', 'Nigeria', 'Africa/Lagos',
          '07067721854', 'jabiriliyasushinkafi@gmail.com',
          4, 'Python,TypeScript,Flutter,Python (Data),GitHub Actions,PostgreSQL,OAuth2/OIDC,Go test', 'Python,TypeScript', NULL,
          'https://github.com/jabiriliyasushinkafi-pixel?tab=repositories', 'https://www.linkedin.com/in/dr-jabir-iliyasu-1a40721b7?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '08:00', '16:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '8ba7adc8-64a7-4d92-8ef8-bf6b513fe90f', '828eea7c-8bdd-4e82-9ef7-db1ff6e9245d',
          'Mike Michael', 'mike-michael-1',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07060845087', 'michaelmike234@gmail.com',
          2, 'Python,React,React Native,Python (Data),ML Ops,LLM Apps,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,Vulnerability Mgmt,Postman', 'Python', 'MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents)',
          'https://github.com/CureFirstResearch/MYC', 'https://www.linkedin.com/in/mike-michael-17202a1b0', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '93353ada-db37-4f2a-961b-e14a1f76a36b', '8318d716-8f14-4ab4-9c5c-e71e5d3c5c73',
          'Abdulsamad Abbas', 'abdulsamad-abbas',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08130630575', 'abdulsamadabbas21@gmail.com',
          2, 'Java,TypeScript,Flutter,LLM Apps,GitHub Actions,MySQL,OAuth2/OIDC,Cypress', 'Java,TypeScript', NULL,
          'https://github.com/Abdulkhanoba', 'https://www.linkedin.com/in/abdulsamad-abbas-208a0b177', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5ab63c37-0c60-4202-98e1-7f3eec4528a8', '2198b8ee-189f-4792-adaa-612eaaecdf28',
          'Mubarak Mohammed Abdullahi', 'mubarak-mohammed-abdullahi',
          'NIGERIA', 'Nigeria', 'Africa/Lagos',
          '07032303782', 'mubarakmohammed19944@gmail.com',
          5, 'Java,Next.js,Flutter,Python (Data),Helm,MySQL,Redis,OAuth2/OIDC,Cypress,JUnit', 'Java,Python', NULL,
          'https://github.com/...', 'https://www.linkedin.com/me?trk=p_mwlite_feed-secondary_nav', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '28427473-d569-4e00-b843-3fc4c0daf056', 'bd334af7-b215-4021-bd37-bb1d2120362a',
          'Olorunosebi Dhikrat Motunraryo', 'olorunosebi-dhikrat-motunraryo',
          '16:21', 'Nigeria', 'Africa/Lagos',
          '+2348171920875', 'tgoldent82@gmail.com',
          NULL, 'Java,Python,React,Next.js,Flutter,Swift,Python (Data),Spark,Airflow,ML Ops,LLM Apps,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Postman,Go test', 'Java,Python,Swift', NULL,
          'https://github.com/CYBERGOLD-D', 'https://www.linkedin.com/in/olorunosebi-dhikrat-motunrayo-071883242', 'https://nothing',
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0726c192-24f3-4eed-a232-63bfb1a68719', '993bb92a-5e96-4342-b10b-5acd7c90e8f2',
          'Musa Hussaini', 'musa-hussaini',
          'Tudun Jukun Zaria', 'Nigeria', 'Africa/Lagos',
          '08039197175', 'abbascogaladima@gmail.com',
          2, 'Java,Python,TypeScript,Flutter,Python (Data),ML Ops,GitHub Actions,MySQL,OAuth2/OIDC,Vulnerability Mgmt,Playwright,Go test', 'Java,Python,TypeScript', 'Performance tuning',
          'https://github.com/Abbatee001', 'https://www.linkedin.com/in/hussaini-musa-0111992a0?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c6f30cc1-aef4-4f74-8a47-55256ae169cf', '4fa76119-9050-4583-9c64-f4fa3a18f98c',
          'Abdullahi Shuaibu Aliyu', 'abdullahi-shuaibu-aliyu',
          'Kano sate', 'Nigeria', 'Africa/Lagos',
          '08061246554', 'abdullahi.shuaibualiyu@gmail.com',
          5, '.NET,TypeScript,Flutter,LLM Apps,GitHub Actions,PostgreSQL,Vulnerability Mgmt,Cypress', 'TypeScript', 'LLM Apps (RAG/Agents)',
          'https://github.com/abdullahiibrahimsani10-sudo', 'https://www.linkedin.com/in/abdullahi-shuaibu-aliyu-b63897149?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'fc58c549-f691-4f7e-8679-0f7599510c8a', '11c552b8-37fa-4645-9882-1af2e78ead31',
          'ABUBAKAR ADAMU FAGGO', 'abubakar-adamu-faggo',
          'Bauchi Nigeria — West Africa Time (WAT)', 'Nigeria', 'Africa/Lagos',
          '08101022795', 'aadamufaggo@gmail.com',
          4, 'Java,Python,TypeScript,Flutter,Python (Data),GitHub Actions,MySQL,mTLS,Playwright', 'Java,Python,TypeScript', 'Terraform,GitHub Actions',
          'https://github.com/settings/profile', 'https://www.linkedin.com/in/adamu-faggo-abubakar-b58135365?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'DevOps & Cloud' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '8ef5b5a1-2873-49fa-bc70-32802ac3305b', 'e55c37db-84fd-4403-b5be-7c66bf31c2b0',
          'Abdulrashid aliyu', 'abdulrashid-aliyu',
          'Sokoto', 'Nigeria', 'Africa/Lagos',
          '08139038500', '081abdulrashidaliyu@gmail.com',
          3, 'Node.js,Java,Python,React,Flutter,Python (Data),Docker,GitHub Actions,MongoDB,OAuth2/OIDC,JUnit', 'Python,Java', 'APIs (REST),gRPC,Concurrency patterns,Performance tuning',
          'https://github.com/Abdulrashid Aliyu', 'https://www.linkedin.com/in/Abdulrashid', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '53ebcac1-0086-44a0-86dc-ade56751e78b', '2dd3b239-adac-439e-9caf-6d1050a655fc',
          'Olamide David Omisanmi', 'olamide-david-omisanmi',
          'Ibadan', 'Nigeria', 'Africa/Lagos',
          '08104403347', 'olamideomisanmi@gmail.com',
          7, 'Java,Python,React,Flutter,Kotlin,Python (Data),Airflow,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,SIEM/SOC,Playwright,Postman', 'Java,Python,Kotlin', NULL,
          'https://github.com/olamideomisanmi', 'https://www.linkedin.com/in/olamide-omisanmi-961606b9', NULL,
          'one_month', 'hybrid',
          '08:00', '16:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'fc021a58-3fcd-43c2-b264-3f351f722710', '5b4a8a45-72b3-4cbd-af20-b2785b5d00eb',
          'Kabiru Usman', 'kabiru-usman',
          'Nigeria;', 'Nigeria', 'Africa/Lagos',
          '08034573558', 'mydotstyle@gmail.com',
          13, 'Node.js,Java,Python,React,Next.js,TypeScript,Flutter,React Native,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman', 'Java,Python,TypeScript', NULL,
          'https://github.com/Kaymata', 'https://www.linkedin.com/me?trk=p_mwlite_feed-secondary_nav', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '61d3cd85-9a6f-4f59-850c-89a28c023ec9', '9a6d5de1-4f05-4e31-a45c-7d58b04a6f7b',
          'Emmanuel Olafusi', 'emmanuel-olafusi',
          'Ile-Ife', 'Nigeria', 'Africa/Lagos',
          '8146456544', 'emmanuelolafusi.digifyng@gmail.com',
          3, 'Node.js,Java,Python,TypeScript,Flutter,Python (Data),Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,MongoDB,Redis,OAuth2/OIDC,Postman,JUnit', 'Python,Java,TypeScript', 'APIs (REST)',
          'http://www.github.com/olaniyi-emmanuel', 'http://www.linkedin.com/in/emmanuel-olafusi', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '98160db0-f898-43dc-b53e-17f35b8c776f', '87916707-9093-4f4f-972b-a1f027ba2d3a',
          'Usman Aliyu', 'usman-aliyu',
          'Katsina', 'Nigeria', 'Africa/Lagos',
          '08064121110', 'abbahusummcy@gmail.com',
          6, 'Go,Java,React,TypeScript,Flutter,Python (Data),GitHub Actions,MySQL,OAuth2/OIDC,Playwright,-Content creation
-Social media management
- community moderation', 'Go,Java,TypeScript,Python', 'Concurrency patterns',
          'https://github.com/Usmanaliyugambo', 'https://linkedin.com/in/usman-aliyu', NULL,
          'immediate', 'remote',
          '08:00', '16:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '91347618-92ee-4f10-907d-4335f174dd99', 'd566c322-84ab-401a-a486-b1f5d4ad4bc9',
          'Abbas Abdullahi', 'abbas-abdullahi',
          'Katsina State', 'Nigeria', 'Africa/Lagos',
          '08061511894', 'abbasabdullahik3@gmail.com',
          8, 'Java,.NET,Python,React,Flutter,Python (Data),GitHub Actions,PostgreSQL,Vulnerability Mgmt,Playwright', 'Java,Python', NULL,
          'https://github.com/abbasabdullahik3', 'https://www.linkedin.com/abbas-abdullahi-2808221b4', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ba7fd68b-f62d-4b5b-b91e-bddd2e79bbb2', 'c7a065ab-45e8-4e6b-98e7-4e72397cdcf2',
          'Mohammed Kadir Segun', 'mohammed-kadir-segun',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08063297354', 'mohammedfanta7@gmail.com',
          5, 'Node.js,Python,Next.js,Flutter,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,PostgreSQL,MySQL,MongoDB,SIEM/SOC,Playwright,Cypress', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/mohammedkad', 'https://www.linkedin.com/in/mohammed-kadir-segun-37668a91', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '2c20ae1a-20f5-4152-a43a-8f23eedf4082', 'ce2e01d7-a7b4-40cb-9293-bfb2ebce6d01',
          'Victor Ugochukwu Anyaso', 'victor-ugochukwu-anyaso',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08038945159', 'aanyasougo@gmail.com',
          3, 'Python,TypeScript,React Native,LLM Apps,Terraform,MongoDB,Vulnerability Mgmt,Postman', 'Java,Python,TypeScript', 'APIs (REST),Performance tuning',
          'https://github.com/aanyasougo1/nitda-', 'https://www.linkedin.com/in/victor-anyaso-717565283', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '818c730e-6372-4a6c-b8c6-0e05e1e87145', '4e4fd58f-dc9a-4e73-8e8e-ddf39b0d6091',
          'Daniel Yamai Philips', 'daniel-yamai-philips',
          'Jalingo', 'Nigeria', 'Africa/Lagos',
          '08131138288', 'danielyamaip112@gmail.com',
          1, 'Python,React,Next.js,TypeScript,Flutter,React Native,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,Redis,OAuth2/OIDC,Vulnerability Mgmt,Playwright,Postman,AI engineer,Google Cloud Developer', 'Python,TypeScript', 'MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents)',
          'https://github.com/Rexangels', 'https://www.linkedin.com/in/daniel-yamai-philips-b79875277?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c5e66d70-22b0-4296-a266-11f6832bc666', 'a3536a70-9055-49ae-a7aa-6adf065b9c29',
          'Muyideen Olufemi NAJIM', 'muyideen-olufemi-najim',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08034644606', 'muyinajim@gmail.com',
          3, 'Java,.NET,Next.js,TypeScript,Flutter,Swift,Python (Data),ML Ops,LLM Apps,GitHub Actions,ArgoCD,PostgreSQL,MySQL,SIEM/SOC,Playwright,Postman', 'Python,Java,TypeScript,Swift', 'APIs (REST),Concurrency patterns,Performance tuning',
          'https://github.com/muyideenNajim', 'https://linkedin.com/in/muyideen-olufeminajim-3282b6A5', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '877025fb-33e0-40a9-9a63-da9c0f88df89', 'd2e7b6cd-e32e-4799-92a8-3cd170386c39',
          'Abubakar Adamu Sani', 'abubakar-adamu-sani',
          'Akure', 'Nigeria', 'Africa/Lagos',
          '09061740000', 'abubakaradamu163@gmail.com',
          1, 'Go,Node.js,Python,React,Next.js,TypeScript,React Native,Python (Data),Spark,Airflow,ML Ops,LLM Apps,Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,MongoDB,Redis,Kafka,OAuth2/OIDC,mTLS,Vulnerability Mgmt,Playwright,Cypress,Postman,Go test', 'Go,Python,TypeScript', 'APIs (REST),gRPC,Concurrency patterns,Performance tuning',
          'https://github.com/AbubakarGidim', 'https://www.linkedin.com/me?trk=p_mwlite_feed-secondary_nav', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c9a0715e-bc11-40e5-878a-655a5ad8bbb4', 'f7bf7981-73ed-42a9-91c7-11a6fa4da5d4',
          'Olaniyi Olafusi', 'olaniyi-olafusi',
          'Ile-Ife', 'Nigeria', 'Africa/Lagos',
          '8146456544', 'olaniyiolafusi@pg-student.oauife.edu.ng',
          3, 'Node.js,Java,Python,TypeScript,Flutter,Python (Data),Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,MongoDB,Redis,Kafka,OAuth2/OIDC,JUnit', 'Python,Java,TypeScript', 'APIs (REST)',
          'https://github.com/olaniyi-emmanuel', 'https://www.linkedin.com/in/emmanuel-olafusi', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f0d3c93e-ff50-4bf4-aaa9-0e95dfe5f5dd', '983ce9fa-6ec6-46e5-9837-7dbdcd8a89b9',
          'Emmanuel Olafusi', 'emmanuel-olafusi-1',
          'Akure', 'Nigeria', 'Africa/Lagos',
          '08069923331', 'hemmy4sucess@gmail.com',
          1, 'Node.js,Java,Python,TypeScript,Flutter,Python (Data),Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,MongoDB,Redis,Kafka,OAuth2/OIDC,JUnit', 'Python,Java,TypeScript', 'APIs (REST)',
          'https://www.github.com/olaniyi-emmanuel', 'https://www.linkedin.com/in/emmanuel-olafusi', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c445a50a-2fac-4851-b6f2-d3ddb414561e', '968b20a1-9646-4546-be16-e71bee884acf',
          'Taita Iliya', 'taita-iliya',
          'Kaduna State', 'Nigeria', 'Africa/Lagos',
          '08035172556', 'iliyataita@gmail.com',
          10, 'Python,React,Flutter,Python (Data),Docker,MySQL,MongoDB,OAuth2/OIDC,Go test', 'Python', 'Data warehousing/lakes',
          'https://github.com/Mr-Taita/Mr-Taita', 'https://www.linkedin.com/in/taita-iliya-data-analyst/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '383c6134-c366-4ac2-97a2-3dab9f156b4d', '894e27b1-b5bb-4830-9151-2ca1d2277446',
          'Dagus Ansi', 'dagus-ansi',
          'Abuja GMT +1', 'Nigeria', 'Africa/Lagos',
          '08062601396', 'dagusansi21@gmail.com',
          3, 'Node.js,Python,React,TypeScript,Flutter,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,SIEM/SOC,Postman,Go test', 'Python,TypeScript', NULL,
          'https://github.com/4c3x', 'https://linkedin.com/ansi-dagus', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          'cad8bf12-bc94-4635-b2f0-49c196a7a41d', '3ad6fdbb-f673-4d7b-897d-868de32fc379',
          'Ibrahim Tukur', 'ibrahim-tukur',
          'keffi', 'Nigeria', 'Africa/Lagos',
          '07065587313', 'itukur212@gmail.com',
          3, 'Node.js,React,Next.js,TypeScript,React Native,Spark,Airflow,GitHub Actions,PostgreSQL,MongoDB,OAuth2/OIDC,Postman,malware Analysis', 'TypeScript', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://github.com/Homie212', 'http://linkedin.com/homie212', 'https://i-smile.netlify.app',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '8d925865-2c66-48c6-b1fd-c16bce81277e', 'b209da5a-c0ff-4910-b045-5e5f9706c616',
          'Okechukwu Eke Okorie', 'okechukwu-eke-okorie',
          'Rivers State Nigeria.', 'Nigeria', 'Africa/Lagos',
          '08036134725', 'okechukwueke84@gmail.com',
          12, 'Go,.NET,React,TypeScript,Swift,Python (Data),Kubernetes,GitHub Actions,MySQL,Vulnerability Mgmt,SIEM/SOC,Go test', 'Go,TypeScript,Swift,Python', NULL,
          'https://www.github.com/eke', 'https://linkedin.com/in/okechukwue-09198a83', NULL,
          'two_three_months', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '128a1e97-00ee-474b-9c53-c5d285966d5f', '50b5caf4-a82d-4dce-9c3e-ece6a35d99b0',
          'Uwabor Collins', 'uwabor-collins',
          'Edo state', 'Nigeria', 'Africa/Lagos',
          '08139371889', 'legendarycolins@yahoo.com',
          2, 'Python,React,React Native,Python (Data),Docker,PostgreSQL,OAuth2/OIDC,Cypress', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/Dev0psKing', 'https://linkedin.com/in/collins-uwabor', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3a293ca8-1161-4792-a8f7-76cfb76bacca', '0360b4a5-a3b0-422b-b5c9-686a23b1a61f',
          'AHMAD MUHAMMAD', 'ahmad-muhammad',
          'Hotoro Kano State', 'Nigeria', 'Africa/Lagos',
          '07035442423', 'asanigumel2@gmail.com',
          15, 'Go,Java,.NET,Python,React,Next.js,Vue,TypeScript,Flutter,React Native,Kotlin,Swift,Python (Data),Spark,Airflow,ML Ops,Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,Redis,Kafka,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,JUnit,Go test', 'Go,Java,Python,TypeScript,Kotlin,Swift', NULL,
          'https://github.com/asanigumel', 'https://www.linkedin.com/in/ahmad-muhammad-7517ab3a7?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c428448d-6d28-4cd2-b85e-52a525aa97d6', 'f9bfd5ae-7c6b-44a7-a6b9-0c67bb95690d',
          'Samaila Musa Bah', 'samaila-musa-bah',
          NULL, 'Nigeria', 'Africa/Lagos',
          '+2348130424547', 'kanawaallme@gmail.com',
          8, 'Python,React,TypeScript,Flutter,Swift,Python (Data),ML Ops,LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Go test', 'Python,TypeScript,Swift', 'MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/Aquarian-wolf', 'https://www.linkedin.com/in/samaila-bah?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '72b0168a-17a7-40ac-b8d2-5ebb1834590c', 'ac7e1664-68d7-4d80-a64c-becf53774f92',
          'Halidu Ibrahim Umar', 'halidu-ibrahim-umar',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08069043130', 'umahalidu@gmail.com',
          6, 'Java,.NET,Python,Next.js,TypeScript,Flutter,Kotlin,Python (Data),Airflow,ML Ops,Docker,Kubernetes,GitHub Actions,MySQL,Kafka,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,Cypress,Go test', 'Java,Python,TypeScript,Kotlin', NULL,
          'https://www.github.com/in/halidu-umar', 'https://www.linkedin.com/in/halidu-umar-8692a6133/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a4d8fdba-7b07-4b36-85cb-9c74f9dab380', '91ea880c-563f-47a7-a6d5-85fb043c4482',
          'EHISUORIA ISI-OMOIGBERALE', 'ehisuoria-isi-omoigberale',
          NULL, 'Nigeria', 'Africa/Lagos',
          '09134665654', 'e-isiomoigberale@uniben.edu',
          13, 'Node.js,Python,React,Next.js,Vue,TypeScript,Flutter,React Native,Kotlin,Swift,Python (Data),Spark,ML Ops,LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,JUnit', 'Python,TypeScript,Kotlin,Swift', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),Data warehousing/lakes',
          'https://github.com/Poyaya', 'https://www.linkedin.com/in/ehiisi/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a91d813f-8170-4d48-bf67-a39ac6b98cf7', '24ed285c-cc31-49aa-8989-dfef9c867d8a',
          'Aminu surajo', 'aminu-surajo',
          'Kaduna', 'Nigeria', 'Africa/Lagos',
          '07063828050', 'abbamin30@gmail.com',
          5, 'Go,Java,.NET,Python,React,TypeScript,Flutter,React Native,Swift,Python (Data),ML Ops,GitHub Actions,MySQL,mTLS,Playwright,Cypress', 'Go,Java,Python,TypeScript,Swift', NULL,
          'https://github.com/dashboard', 'https://www.linkedin.com/abbamin30', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '07578dda-2331-49ba-a35a-ef914a8adcae', 'd14c2a19-3239-4a27-8d0b-38f6a8e0d605',
          'Gospel Theodore Orok', 'gospel-theodore-orok',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '09055082080', 'orokgospel@gmail.com',
          4, 'Python,React,Next.js,Kotlin,Python (Data),Spark,Airflow,LLM Apps,GitHub Actions,PostgreSQL,MySQL,Kafka,OAuth2/OIDC,Postman,Pyflink,ADF,Iceberg,Flink,Trino', 'Python,Kotlin', 'Data pipelines (e.g.,Spark/Airflow),Data warehousing/lakes',
          'https://github.com/orokgospel', 'https://www.linkedin.com/in/orokgospel', 'https://orokgospel.medium.com/',
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd3f21d4b-6617-40f8-a1a7-cb3b5c10865b', 'f775a244-4431-4c5b-981b-492b73bb3b46',
          'Peter Bassey', 'peter-bassey',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08067571533', 'd.jpetosky@gmail.com',
          5, 'Python,Next.js,React Native,Python (Data),Spark,GitHub Actions,MySQL,OAuth2/OIDC,Postman', 'Python', NULL,
          'https://github.com/peterbassey1533', 'https://www.linkedin.com/in/peter-bassey', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '54c34623-00d9-4065-8700-3d6a46527fd0', '8e45c5e5-1b2c-4fe2-b96d-36c08192c078',
          'Benjamin Asenso', 'benjamin-asenso',
          NULL, 'Nigeria', 'Africa/Lagos',
          '+233535331264', 'asenso95@gmail.com',
          4, 'Python,React,React Native,Python (Data),GitHub Actions,PostgreSQL,OAuth2/OIDC,Postman', 'Python', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://www.github.com/asenso95', 'https://www.linkedin.com/in/benasenso', 'https://benasenso.com',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '38ac74ee-18d4-4efd-870d-ab1a33a8296a', 'f5d230ba-7043-42c6-882d-d6f6f76c4b66',
          'Abdul-Muqtadir Zukaneni', 'abdul-muqtadir-zukaneni',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '09066793368', 'muqtadirabdul2@gmail.com',
          5, 'Python,React,React Native,Python (Data),GitHub Actions,Elastic,SIEM/SOC,Playwright', 'Python', NULL,
          'https://github.com/TadirNeni', 'https://www.linkedin.com/in/abdul~muqtadir-zukaneni-80903222a', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f4977c6b-f761-441a-9a6d-5bb9be02d6c7', '257d5333-e305-49c0-8140-b16fe8c70e7a',
          'Godson David', 'godson-david',
          'Lagos Nigeria', 'Nigeria', 'Africa/Lagos',
          '+2347088212727', 'davidgsongs@gmail.com',
          5, 'Node.js,Python,Rust,React,Next.js,TypeScript,React Native,Python (Data),Docker,Kubernetes,Terraform,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,Kafka,Elastic,OAuth2/OIDC,mTLS,Playwright,Postman,Flask,prompt engineering,Cloud Ops', 'Python,Rust,TypeScript', 'APIs (REST),gRPC,Concurrency patterns,Performance tuning',
          'https://github.com/davysongs', 'https://www.linkedin.com/in/davysongs', 'https://davysongs.pages.dev',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '1209cbe6-c490-4fdb-b6da-cb58c0aeb009', '1d94ddc5-4ec1-460d-be6b-e3f3dc582273',
          'Olatunji Rafiu Omojasola', 'olatunji-rafiu-omojasola',
          'Ilorin West African Time', 'Nigeria', 'Africa/Lagos',
          '08106963556', 'omojasola19@gmail.com',
          4, 'Java,React,React Native,Python (Data),Docker,Kubernetes,MySQL,Vulnerability Mgmt,Go test', 'Java,Python', 'Kubernetes',
          'https://github.com/Waptailor?tab=repositories', 'https://www.linkedin.com/in/olatunji-omojasola-348a621a8?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'DevOps & Cloud' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5d8c540d-1b92-4171-ae6b-c5dd8ee4eb48', 'c5dfae12-5c2d-4c2e-ae8a-680d8a49bbe2',
          'Abdulmajid Ibrahim', 'abdulmajid-ibrahim',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '08180709154', 'majiid.ib@gmail.com',
          4, 'Python,TypeScript,Flutter,Python (Data),Docker,MySQL,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Go test,Security Monitoring,Incident Response,Threat Intel,Log Analysis e.t.c. Please note that response on some sections were mandatory instead of optional.', 'Python,TypeScript', NULL,
          'https://www.github.com/abdulmajid-ibrahim-6a431a149?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', 'https://www.linkedin.com/in/abdulmajid-ibrahim-6a431a149?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '28235c6b-c8ae-4883-bd21-824a9ba3fe44', 'fa21adb6-391d-4dd1-9913-ac3d0359d438',
          'Abdussalam Babawuro Ahmad', 'abdussalam-babawuro-ahmad',
          'Zamfara State', 'Nigeria', 'Africa/Lagos',
          '08131527559', 'abahmad03@gmail.com',
          3, 'Python,TypeScript,Flutter,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Go test', 'Python,TypeScript', NULL,
          'https://github.com/eerrphaan-lab', 'https://www.linkedin.com/in/musa-sani-9b9949367?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'bf6e9714-1098-4992-bb2f-d87c612fe3bd', '29ba6b20-50b9-4f00-9a02-340883bb2a1e',
          'Kingsley Eberendu', 'kingsley-eberendu',
          'West Africa time', 'Nigeria', 'Africa/Lagos',
          '+2347035090836', 'eberendukings@gmail.com',
          2, 'Python,React,Flutter,Python (Data),GitHub Actions,Redis,Vulnerability Mgmt,JUnit', 'Python', 'GitHub Actions',
          'https://github.com/session', 'http://linkedin.com/in/kingsley-eberendu', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'DevOps & Cloud' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '49f24298-d495-463a-9745-dcc68d2170cb', 'ebafcbd6-b723-48d1-aba0-b2c0eed9400a',
          'Abba bulama abba', 'abba-bulama-abba',
          'MaiduguriBornoState 7:40', 'Nigeria', 'Africa/Lagos',
          '09028025525', 'abbabulamaabba2020@gmail.com',
          3, 'Node.js,Python,React,TypeScript,Flutter,React Native,Python (Data),ML Ops,LLM Apps,Docker,GitHub Actions,MySQL,MongoDB,OAuth2/OIDC,Postman,Git & GitHub
REST API Development
Machine Learning Model Development
Mobile App UI/UX Design
Problem Solving & Debugging', 'Python,TypeScript', NULL,
          'https://github.com/yourusername', 'https://www.linkedin.com/in/yourname', 'https://github.com/yourusername',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd46858ff-e9ed-4c38-9ce9-4e1707dd2497', '3ca3c5a4-38b0-4041-b40a-578f4ff9e0d2',
          'Aliyu Usman', 'aliyu-usman',
          'Nigeria (WAT - West Africa Time)', 'Nigeria', 'Africa/Lagos',
          '07063721787', 'aliyuusman64@gmail.com',
          6, 'Node.js,Java,Python,React,Next.js,Vue,TypeScript,React Native,Kotlin,Python (Data),ML Ops,LLM Apps,Docker,Terraform,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,Kafka,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,JUnit,Full-Stack Development (React.js,Express.js,Django,FastAPI),Mobile Development (React Native,Android/Kotlin,Jetpack Compose),AI/ML Engineering (Machine Learning,NLP,Computer Vision,LLM Applications,Prompt Engineering - 3MTT AI/ML Cohort 2,3MTT Deeptech NLP Cohort 1),Database Engineering (MySQL,SQLite,TursoDB),UI/UX Design (Google UX Certified,Adobe Graphic Designer,Figma,Responsive Design),API Design & Development (RESTful APIs,WebRTC integration),Materials Science Research (Metallurgical Engineering,Materials Testing,Microscopy),Technical Writing & Documentation,STEM Education & Curriculum Development,Government Research Collaboration (NWDS Project - Federal Ministry of Communications)', 'Node.js,Java,Python,TypeScript,Kotlin', 'APIs (REST),Concurrency patterns,Performance tuning',
          'https://github.com/aliyuthman', 'https://www.linkedin.com/in/aliyuthman/', 'https://aliyuthman.vercel.app/',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '00ba7bbc-a3f3-4299-9149-2a3cab6e22ba', 'dd4fd665-dd32-44ad-ac18-fd0311ced12f',
          'Ahmed Anas Auta', 'ahmed-anas-auta',
          'OBI LGA', 'Nigeria', 'Africa/Lagos',
          '08100491442', 'autaahmed1@gmail.com',
          6, 'Java,.NET,Python,React,Next.js,TypeScript,Flutter,Swift,Python (Data),Spark,Airflow,Docker,Kubernetes,GitHub Actions,PostgreSQL,Kafka,Vulnerability Mgmt,SIEM/SOC,Cypress,Postman,Go test,Nil', 'Java,Python,TypeScript,Swift', NULL,
          'https://github.com/Auta1442', 'https://www.linkedin.com/in/AhmedAnasAuta', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '688c3ab6-f2d4-4895-aa6a-335f8d2be934', '3a7af04e-7f72-4721-b660-de16ac90d1f1',
          'AMINCHI SAMSON', 'aminchi-samson',
          'Plateau state', 'Nigeria', 'Africa/Lagos',
          '08107883939', 'amincisamson@gmail.com',
          4, 'Node.js,Python,React,Next.js,Flutter,Swift,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,Vulnerability Mgmt,SIEM/SOC,Playwright,Postman,Go test', 'Python,Swift', NULL,
          'https://github.com/aminchi', 'https://www.linkedin.com/in/configure-t/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd9b4333d-1c3d-49ea-bbe7-5f27e8cfe5b7', 'db116671-8144-4dae-ac82-67bfd7022c30',
          'Test Run', 'test-run',
          'ABUJA', 'Nigeria', 'Africa/Lagos',
          '08039117003', 'shadrach.abdul@gmail.com',
          15, 'Go,React,Flutter,Python (Data),Docker,PostgreSQL,Vulnerability Mgmt,Postman', 'Go,Python', 'APIs (REST),gRPC,Concurrency patterns,Performance tuning',
          'https://github.com/abdul.shadrach', 'https://www.linkedin.com/abdul.shadrach', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '2777701b-e3ba-41bb-aa32-c5d6dc2882a4', 'adceab09-7b93-4a81-a773-2fe19e16ac58',
          'OLASUPO Azeez Olawale', 'olasupo-azeez-olawale-1',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '08078724160', 'paragonaesthetics2022@gmail.com',
          2, 'Node.js,Python,React,React Native,Python (Data),LLM Apps,Docker,PostgreSQL,MySQL,OAuth2/OIDC,Playwright,Data Analysis', 'Python', 'LLM Apps (RAG/Agents)',
          'https://github.com/paragon-tech001', 'https://www.linkedin.com/in/olasupo-azeez/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '6749b1c3-3c04-47e2-a307-3948f24533c3', 'e70f6a59-88de-428d-97f7-f18093072753',
          'Hassan Yusuf', 'hassan-yusuf',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08030795224', 'hassanyus581@gmail.com',
          5, 'Node.js,Java,Python,React,Swift,Python (Data),ML Ops,LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Playwright,Go test', 'Java,Python,Swift', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/hassanyusuf6826/', 'https://www.linkedin.com/in/hassan-yusuf-28a45935b', 'https://hassanyusuf6826.github.io/portfolio/',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '1cca2bcd-d142-4dab-9880-39d7879203b9', 'b6b1fc6b-6b42-4f79-bb86-9222c3abad0d',
          'Okoro Dandy Junior', 'okoro-dandy-junior',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08138780645', 'okorodandyj@gmail.com',
          1, 'Java,Python,React,Flutter,Python (Data),Docker,Kubernetes,MySQL,MongoDB,Vulnerability Mgmt,SIEM/SOC,Postman', 'Java,Python', NULL,
          'https://github.com/demondandy', 'http://www.linkedin.com/in/okoro-dandy-8b5845111', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5f5a190d-bfd7-41fb-98ec-9c5c276ef158', 'f8e8b3fc-297e-43ea-85ad-1f5a7014526b',
          'Umar Rabiu', 'umar-rabiu',
          'Nigeria GMT+1', 'Nigeria', 'Africa/Lagos',
          '08162653436', 'umarzkidz@gmail.com',
          4, 'Python,Next.js,Flutter,Kotlin,Python (Data),Kubernetes,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Vulnerability Mgmt,JUnit,Go test,Quality assurance testing', 'Python,Kotlin', NULL,
          'https://github.com/umarzkidz-beep.com', 'https://www.linkedin.com/in/umar-rabiu-a51366227', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a42fc02f-8bc3-41ad-a54d-7ee28318f60b', '4921240d-4561-4073-b01c-6a69df8e4be2',
          'Salisu Aminu Abdurrahman', 'salisu-aminu-abdurrahman',
          'West Africa Time', 'Nigeria', 'Africa/Lagos',
          '08166667095', 'salisuaminu615@gmail.com',
          5, 'Node.js,.NET,Python,React,Next.js,TypeScript,React Native,Python (Data),LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,OAuth2/OIDC,Cypress,Postman', 'Python,TypeScript', 'Design systems,Component libraries,State management',
          'https://github.com/salicode', 'https://www.linkedin.com/in/salisu-abdurrahman-854115161/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a85395a8-739d-4266-8948-4ac028b728bf', '737b227c-da35-42c2-8f7f-d51e3d8ec4c9',
          'Abba Magaji', 'abba-magaji',
          'Gumel Local Government Jigawa State', 'Nigeria', 'Africa/Lagos',
          '07011212311', 'abbamagaj01@gmail.com',
          3, 'Python,React,Flutter,React Native,Python (Data),Docker,MySQL,OAuth2/OIDC,Postman', 'Python', NULL,
          'https://github.com/abbamagaji', 'https://www.linkedin.com/in/abba-magaji', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '4eb96e82-5f2d-4ea1-9bad-1fcb2667ee94', '61a25f62-a27d-4eec-b459-3df43763b675',
          'Oladimeji Toba Olabisi', 'oladimeji-toba-olabisi',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '09065358971', 'smtpwtf@gmail.com',
          2, 'Node.js,Python,React,TypeScript,Flutter,Python (Data),GitHub Actions,MySQL,MongoDB,SIEM/SOC,Playwright,Cypress', 'Python,TypeScript', 'APIs (REST)',
          'https://github.com/Justsmtp', 'https://www.linkedin.com/in/oladimeji-toba-377b9526b/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '77d02354-fbbe-4752-a149-644407160d6f', '049f62c6-e9da-4bac-ac36-bc003fed5d7c',
          'Henry Chukwuma', 'henry-chukwuma',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '+2348071971438', 'henryonyekachim@gmail.com',
          1, 'Python,React,React Native,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Go test', 'Python', NULL,
          'https://github.com/henryonyekachim/henryonyekachim', 'https://www.linkedin.com/in/henrychukwuma?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '08:00', '16:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          'f956061e-a273-4afe-81bf-ffd67ff1afcd', 'a0c604c7-9bd4-462f-a666-897c36468c5d',
          'Ahmad Abdulrashid', 'ahmad-abdulrashid',
          'Kogi state', 'Nigeria', 'Africa/Lagos',
          '07034640600', 'aarumah234@gmail.com',
          6, 'Java,.NET,Python,React,Kotlin,Python (Data),Docker,Kubernetes,PostgreSQL,MySQL,OAuth2/OIDC,Postman,Data analysis,machine learning and Research', 'Java,Python,Kotlin', 'MLOps (e.g.,MLflow/KServe),Data warehousing/lakes',
          'https://www.github.com/ahmad_abdulrashid', 'https://www.linkedin.com/in/ahmad-abdulrashid-363012192?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3313bd0f-2305-4085-8375-b7ef8fd93226', 'f80db231-2271-4386-ab59-d0c5e6350570',
          'Lawal Lawal Ali', 'lawal-lawal-ali',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08036562100', 'lawalalilawal@gmail.com',
          3, 'Python,Next.js,Flutter,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,PostgreSQL,MySQL,Vulnerability Mgmt,Postman', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents)',
          'https://github.com/aleey-lawal', 'https://www.linkedin.com/aleey', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '69eb7d35-bc24-4645-9c48-5f3e03a6e560', 'ea3788ef-da37-4426-b125-9684c565f095',
          'Folakunmi Ojemuyiwa', 'folakunmi-ojemuyiwa',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08025759995', 'olufolakunmio@gmail.com',
          18, 'Python,React,Flutter,Python (Data),Kubernetes,PostgreSQL,SIEM/SOC,JUnit', 'Python', NULL,
          'https://github.com/folakunmio', 'https://www.linkedin.com/in/folakunmio/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '4eb2134d-22b8-48fa-8628-4cee4050c073', 'b1587f0c-11ee-4110-a483-c73e06616e35',
          'Jafar Mukhtar', 'jafar-mukhtar',
          'Daura', 'Nigeria', 'Africa/Lagos',
          '08035515866', 'jafarmk2001@gmail.com',
          1, 'Python,React,Swift,Python (Data),Kubernetes,MongoDB,SIEM/SOC,Go test', 'Python,Swift', NULL,
          'https://www.github.com/jafarmk2001@gmail.com', 'https://www.linkedin.com/jafarmk2001@gmail.com', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ab987f9e-c030-47a0-8262-ee96ded47826', '5ed893df-0938-4fae-889c-9a437d56c5d4',
          'Chibuike Ogboloko', 'chibuike-ogboloko',
          'Abakaliki', 'Nigeria', 'Africa/Lagos',
          '07044082127', 'ogbolokochibuike@gmail.com',
          2, 'Python,React,Flutter,Python (Data),Docker,MySQL,SIEM/SOC,Playwright', 'Python', 'LLM Apps (RAG/Agents)',
          'https://github.com/ChibuikeOgboloko', 'https://linkedin.com/in/chibuike-ogboloko', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f7f0764c-c60f-4efa-92d9-fe03b506c175', 'b54ffe2f-3db7-47a5-9de1-19bbc14a75ef',
          'NWANAMA EMMANUEL KENECHUKWU', 'nwanama-emmanuel-kenechukwu',
          'EDO STATE', 'Nigeria', 'Africa/Lagos',
          '08147291797', 'emmanuelkenechukwu123@gmail.com',
          3, 'Java,Python,TypeScript,Flutter,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Playwright', 'Java,Python,TypeScript', NULL,
          'https://github.com/nwanama', 'https://www.linkedin.com/in/nwanama-emmanuel-kenechukwu-b420951b5', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '555de691-9426-4eee-bb65-7fafbda6abf2', '97ccb2df-1f62-4b0c-8dac-733338a58721',
          'Nwosu Harrison Chukwunyere', 'nwosu-harrison-chukwunyere',
          'Owerri', 'Nigeria', 'Africa/Lagos',
          '08067106165', 'harrison.nwosu@yahoo.co.uk',
          5, 'Python,Next.js,Flutter,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Go test', 'Python', NULL,
          'https://github.com/Harrysi001', 'https://www.linkedin.com/in/nwosu-harrison', NULL,
          'one_month', 'on_site',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'effc68b6-6141-4def-bf6f-4cfa675301d8', '320dfc4a-1929-44d5-a655-c692125b975e',
          'Abubakar Bala', 'abubakar-bala',
          'Nigeria Kano state', 'Nigeria', 'Africa/Lagos',
          '07065958908', 'abbakarbala09@gmail.com',
          5, 'Go,.NET,TypeScript,Flutter,Python (Data),GitHub Actions,PostgreSQL,Vulnerability Mgmt,Playwright', 'Go,TypeScript,Python', NULL,
          'https://github.com/abubakar', 'https://www.linkedin.com/abbakar-bala-', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0d82d9b4-cd42-473f-8755-1c47fba9d255', '8eb89e3f-8103-4d5e-8b0a-b10d5320d4a5',
          'Abacha John Esson', 'abacha-john-esson',
          'Lagos West African time +1', 'Nigeria', 'Africa/Lagos',
          '08160925640', 'abachajohnesson@gmail.com',
          3, 'Go,Java,Python,React,Swift,Python (Data),Airflow,Kubernetes,GitHub Actions,MySQL,Vulnerability Mgmt,Go test,Technical support,IT Asset management', 'Go,Java,Python,Swift', NULL,
          'https://github.com/essonabacha', 'https://www.linkedin.com/in/abacha-esson-john-24341919a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '08:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ea102298-ace5-4957-ad9c-8e1f966aba78', '539b9239-e92d-4ce5-83a5-a50ee468cbf1',
          'Abbas Musa Abbas', 'abbas-musa-abbas',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '07039089744', 'abbasmusaabbas3@gmail.com',
          11, '.NET,Next.js,Flutter,Python (Data),GitHub Actions,PostgreSQL,SIEM/SOC,Playwright', 'Python', NULL,
          'https://github.com/abbasmusaabbas/abbasmusaabbas', 'https://www.linkedin.com/me?trk=p_mwlite_profile_self-secondary_nav', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0837d2ce-140d-4280-912b-d829a3e37fb7', '4f58e507-10ca-44a0-bbbd-92db97a29bc9',
          'Remilekun Olakunle', 'remilekun-olakunle',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '09060549323', 'remilekun95@gmail.com',
          5, 'Python,Next.js,Kotlin,Python (Data),Docker,MySQL,Vulnerability Mgmt,SIEM/SOC,Go test', 'Python,Kotlin', NULL,
          'https://github.com/Rhemmy95', 'https://www.linkedin.com/in/remilekun95', 'https://medium.com/@remilekun95',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '6f6c2b24-9e7e-4dd3-a1d2-693ea82f2435', '53dc7622-a0b2-4d77-ab18-3dd4dc46af83',
          'Isya Isyaku', 'isya-isyaku',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07031857635', 'isyakuisya@gmail.com',
          5, 'Node.js,Python,React,Next.js,Vue,Flutter,React Native,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,ArgoCD,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,mTLS,Playwright,Postman,Go test', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents)',
          'https://github.com/ishaq-ishaq/', 'https://www.linkedin.com/in/isyakuisya/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c5bec0f7-d918-463b-a309-641d7c6629de', 'ac134757-ec66-4c58-88f9-6f98197134c4',
          'Abah Joseph Sunday', 'abah-joseph-sunday',
          'Lagos  Nigeria', 'Nigeria', 'Africa/Lagos',
          '08139046838', 'abahsunday62@gmail.com',
          15, 'Go,Node.js,Java,.NET,Python,Rust,React,Next.js,Vue,TypeScript,Flutter,React Native,Kotlin,Swift,Python (Data),Spark,Airflow,LLM Apps,Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,MongoDB,Redis,Kafka,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,JUnit,Go test', 'Go,Java,Python,Rust,TypeScript,Kotlin,Swift', 'Design systems',
          'https://github.com/abahsunday62githubrit', 'https://www.linkedin.com/feed/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0605ac82-d522-4d0f-9cba-a8535f1ed669', '20631b22-df4f-4aab-9774-7ed6a10b53ea',
          'Olajide Adejoro Peter', 'olajide-adejoro-peter',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08139514322', 'olajideadejoro@gmail.com',
          6, 'Java,.NET,Rust,Next.js,TypeScript,React Native,Swift,Airflow,LLM Apps,Docker,Kubernetes,Helm,GitHub Actions,PostgreSQL,MySQL,Redis,Vulnerability Mgmt,Playwright,Postman,JUnit,Go test', 'Java,Rust,TypeScript,Swift', NULL,
          'https://github.com/olajideadejoro-dot', 'https://www.linkedin.com/in/adejoro-olajide-375614146?utm_source=share_via&utm_content=profile&utm_medium=member_ios', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ed6fd69c-a1c2-45ed-9ca7-820b0f31421c', '4cd0a769-9178-4b34-af5f-a136dc44694a',
          'MICHAEL', 'michael',
          'LAGOS', 'Nigeria', 'Africa/Lagos',
          '07061957135', 'michaelobaro7@gmail.com',
          9, 'Node.js,Java,Python,React,Next.js,React Native,Python (Data),ML Ops,Docker,Kubernetes,MySQL,SIEM/SOC,Go test,NETWORK SECURITY ENGINEERING || HARDWARE ENGINEERING || CCTV CONTROL AND INSTALLATION', 'Java,Python', NULL,
          'https://github.com/michaeloogbe', 'https://www.linkedin.com/in/michaelobraoogbe17', NULL,
          'immediate', 'remote',
          '08:00', '16:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '0a834aac-9d47-4358-b433-57e7a82633ba', 'ca01be65-bec4-4119-bf14-1eafa1f271b4',
          'Suleiman Bello', 'suleiman-bello',
          'Nigeria GMT+1', 'Nigeria', 'Africa/Lagos',
          '+2348166791940', 'sbellojby@gmail.com',
          13, 'Python,React,Flutter,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Go test', 'Python', 'Data pipelines (e.g.,Spark/Airflow)',
          'https://github.com/Sbellojby', 'https://www.linkedin.com/in/sbellojby', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'e66518e9-46eb-4c24-bacd-cd74b6f700c3', '77033cb8-70be-46bd-a071-508d8212f4de',
          'Saba Sulaiman Abiodun', 'saba-sulaiman-abiodun',
          'Kano', 'Nigeria', 'Africa/Lagos',
          '09067447958', 'sabasulaiman6@gmail.com',
          4, '.NET,TypeScript,Kotlin,LLM Apps,Docker,MySQL,Vulnerability Mgmt,Cypress,I do not possess all of the above; my path is in Project Management and Human Resources.', 'TypeScript,Kotlin', NULL,
          'https://github.com/sabasulaiman', 'https://www.linkedin.com/sabasulaiman6', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Product Management' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '377b6a1f-8310-44ee-bfb1-06fdb12e538b', '8d20a25f-8ae8-49e0-9dc4-4ad2aa94a684',
          'Abdulganiyu Aliyu', 'abdulganiyu-aliyu',
          'Funtua Katsina state Nigeria', 'Nigeria', 'Africa/Lagos',
          '08028587356', 'aaliyuddw@gmail.com',
          5, 'Node.js,Python,React,Vue,Flutter,Kotlin,Python (Data),LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Vulnerability Mgmt,Playwright,Postman', 'Python,Kotlin', 'APIs (REST)',
          'https://github.com/Aaliyuddw', 'https://www.linkedin.com/in/Abdulganiyu', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '7e6250a2-8f02-4288-83d5-2475d45879d4', '39155e8b-3397-45ed-b77c-26de34876f05',
          'Elom Cornelius Monday', 'elom-cornelius-monday',
          'Lagos (GMT+1)', 'Nigeria', 'Africa/Lagos',
          '07085000530', 'edugwuchimeremeze@gmail.com',
          4, '.NET,Python,React,TypeScript,Kotlin,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Vulnerability Mgmt,Postman,Scalar and Swagger', '.NET,Python,TypeScript,Kotlin', 'APIs (REST)',
          'https://github.com/CoreachSoft', 'https://www.linkedin.com/in/elom-cornelius-m-a41284217', NULL,
          'immediate', 'hybrid',
          '08:00', '16:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '7f7aca80-c2df-49f9-9ad3-8417690ef955', '139b07a0-8a60-419e-8751-6443074cf609',
          'Ibrahim Shehu Bala', 'ibrahim-shehu-bala',
          'Gusau', 'Nigeria', 'Africa/Lagos',
          '+2348069240066', 'isbala17@gmail.com',
          1, 'Python,TypeScript,Swift,Python (Data),GitHub Actions,Redis,Vulnerability Mgmt,Go test,Data analysis,data cleaning and visualization,spreadsheets (Excel/Google Sheets),basic SQL concepts,project planning and scheduling,Agile fundamentals,stakeholder communication,reporting,and use of digital collaboration tools (Google Workspace,Trello,Asana). Entrepreneurship Skills.', 'Python,TypeScript,Swift', NULL,
          'https://github.com/isbala17', 'https://www.linkedin.com/in/dr-ibrahim-shehu-bala-14b07b85?trk=contact-info', 'https://www.coursera.org/user/4e7430c89c8b2dc9c95c89ec31e4a50a',
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd6eaf3c2-32d6-4260-b5a3-d207a6221be4', 'fce028a3-3ef7-43de-8cec-a14fca7ff5d5',
          'Muhammad Lawal', 'muhammad-lawal',
          'Daura', 'Nigeria', 'Africa/Lagos',
          '09161872524', 'abbaraees@gmail.com',
          3, 'Java,Python,React,TypeScript,React Native,Kotlin,Python (Data),LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Postman,JUnit,Web Application Security', 'Java,Python,TypeScript,Kotlin', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://github.com/Abbaraees', 'https://linkedin.com/in/muhammad-lawal', 'https://abbaraees.me',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '71505ad3-be2f-443a-8438-b19bbcd8aa10', 'a8baca21-2e97-4947-965d-e02aeefbdfd2',
          'UKOH OKON UDOMBO', 'ukoh-okon-udombo',
          'Uyo', 'Nigeria', 'Africa/Lagos',
          '08068800324', 'ukohudombo@gmail.com',
          6, 'Node.js,Java,Python,React,TypeScript,Flutter,Python (Data),Spark,LLM Apps,Kubernetes,GitHub Actions,MySQL,Vulnerability Mgmt,SIEM/SOC,Playwright,Go test', 'Java,Python,TypeScript', NULL,
          'https://github.com/BushUdombo', 'https://www.linkedin.com/in/ukoh-udombo-04b56261?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c5500a86-199d-47ec-a261-670b485dfce2', '7f527722-ee5b-4def-9c09-0696430b40fa',
          'Patience Richard Dzarma', 'patience-richard-dzarma',
          'Abuja FCT', 'Nigeria', 'Africa/Lagos',
          '08166812222', 'patience.dzarma@galaxybackbone.com.ng',
          14, 'Python,TypeScript,Flutter,Python (Data),Docker,MySQL,SIEM/SOC,Go test', 'Python,TypeScript', NULL,
          'https://github.com/pdzarma-arch', 'https://www.linkedin.com/in/patience-richard-dzarma-field-service-engineer-82009848/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a1ec37e0-dc02-49b8-849a-a63e5e60128c', '3806812f-82a1-4f17-a299-b47c7b116df1',
          'Saleh Abubakar', 'saleh-abubakar',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08092575404', 'abubakarsaleh1010@gmail.com',
          NULL, 'Node.js,React,Next.js,TypeScript,React Native,Python (Data),GitHub Actions,PostgreSQL,MongoDB,OAuth2/OIDC,Postman', 'TypeScript,Python', 'Design systems,Component libraries,State management',
          'https://github.com/abubakarsaleh1010/', 'https://www.linkedin.com/nil?_l=en_US', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b47dc6bf-c283-4b2d-9fcd-41670b14cb56', '2285916a-b52d-4e0f-9a3f-6bb98b226c0d',
          'Adam John Sagai', 'adam-john-sagai',
          'Lisbon', 'Nigeria', 'Africa/Lagos',
          '+2348069660410', 'adamsagai@outlook.com',
          20, '.NET,Python,React,Flutter,Python (Data),Docker,MySQL,SIEM/SOC,Postman', 'Python', 'APIs (REST)',
          'https://github.com/ajsagai', 'https://linkedin.com/in/adam-sagai', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '427b9267-b38c-46a1-8097-8428e62aca95', '34e35282-67b2-4201-b271-e1495a2ee842',
          'Okponya Akpegi', 'okponya-akpegi',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07062745857', 'akpegi.okponya@galaxybackbone.com.ng',
          5, 'Python,TypeScript,Flutter,Python (Data),Docker,MySQL,SIEM/SOC,Go test', 'Python,TypeScript', NULL,
          'https://github.com/Akpexy', 'https://www.linkedin.com/in/akpegi-okponya-78a8a087/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c2a59b82-d31a-481c-90e3-bd84a4786a50', '25a95cd2-87c1-4ad6-b5a8-0fba9b9f5436',
          'Abel Ikenna Ugwu', 'abel-ikenna-ugwu',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08169348952', 'ikenna.abel0456@gmail.com',
          5, 'Python,React,React Native,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Go test', 'Python', NULL,
          'https://github.com/Abel-hub0456?tab=overview&from=2022-12-01&to=2022-12-31', 'https://www.linkedin.com/in/abel-ugwu-628b44163/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'faf4f42b-e80c-4b2f-82de-6605140afcbc', 'e5380d10-62de-4c77-89e1-e8aeaddb61fc',
          'Usman Abubakar Jauro', 'usman-abubakar-jauro',
          NULL, 'Nigeria', 'Africa/Lagos',
          '07032237510', 'usman.jauro@galaxybackbone.com.ng',
          10, 'Python,React,React Native,Python (Data),Docker,Kubernetes,MySQL,SIEM/SOC,Go test', 'Python', 'APIs (REST)',
          'http://github.com/UJauro', 'https://www.linkedin.com/in/usman-jauro-150017117/', NULL,
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ac3b6b41-44f1-4cff-8a4e-8510203c2d6e', 'f7262e05-9d30-4bd2-a218-3d97e8114998',
          'Nweke Augustine', 'nweke-augustine',
          NULL, 'Nigeria', 'Africa/Lagos',
          '+2348109516352', 'savvieraustin@gmail.com',
          4, 'Python,React,React Native,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Cypress', 'Python', 'Data warehousing/lakes',
          'https://github.com/Savvierxtn', 'https://www.linkedin.com/in/not-applicable', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ff158b86-9935-4180-bef7-d6e7919048e5', 'aa75fbfd-90ee-4090-9628-9fb8ea2ff844',
          'ABUBAKAR AUWALU SIDI', 'abubakar-auwalu-sidi',
          '(GMT+1)', 'Nigeria', 'Africa/Lagos',
          '09031963644', 'aasythe@gmail.com',
          7, 'Java,Python,TypeScript,Flutter,Python (Data),LLM Apps,GitHub Actions,MySQL,MongoDB,OAuth2/OIDC,Go test', 'Java,Python,TypeScript', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/aasythe/', 'https://www.linkedin.com/abubakarauwalusidi', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '8df5f1a3-8815-45bb-b604-d1f707916db9', 'bcd74547-f852-42a9-98fa-48a7c82ccab1',
          'Alfred Michael Adaji', 'alfred-michael-adaji',
          'Abuja FCT Nigeria', 'Nigeria', 'Africa/Lagos',
          '08116700758', 'alfred.adajl@galaxybackbone.com',
          2, 'Python,TypeScript,Flutter,Python (Data),Docker,MySQL,Vulnerability Mgmt,SIEM/SOC,Playwright', 'Python,TypeScript', NULL,
          'https://github.com/alfredadaji-oss', 'https://www.linkedin.com/in/alfred-adaji-783558317/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '96d4bf81-1fa2-46f4-abe9-f2dddcb3b926', 'de909632-b2ee-46cb-8def-ee72a11e4cd9',
          'Abubakar Mukhtar Ammani', 'abubakar-mukhtar-ammani',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08062465777', 'aammani91@gmail.com',
          7, 'Node.js,Java,Python,React,TypeScript,Flutter,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,Vulnerability Mgmt,Playwright,Cypress', 'Java,Python,TypeScript', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe)',
          'https://github.com/abuAmmani', 'https://linkedin.com/abubakar-ammani', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b29b7dba-7030-47a1-b1ab-265341ba8181', '67959e1e-c16a-4791-9d0b-7c8031283235',
          'Abba kabir Abba', 'abba-kabir-abba',
          'Gyadi gyadi Zaria Road kano', 'Nigeria', 'Africa/Lagos',
          '08167413473', 'abbakabir2010@gmail.com',
          5, 'Java,TypeScript,Flutter,Python (Data),Docker,MySQL,OAuth2/OIDC,Playwright', 'Java,TypeScript,Python', NULL,
          'http://github.com/abbakabir', 'http://www.linkedin.com/abbakabir', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Product Management' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'dc70cdd8-01e9-4332-8b43-bb8ea3b058bf', '1edc6f03-0558-405a-8f39-969c391a8491',
          'ABDULLAHI MUSTAPHA LAWAL', 'abdullahi-mustapha-lawal',
          'Nigeria(Lagos)', 'Nigeria', 'Africa/Lagos',
          '07060676164', 'abdoollahifx@gmail.com',
          3, 'Java,Python,TypeScript,Flutter,Swift,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Go test', 'Java,Python,TypeScript,Swift', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),Data warehousing/lakes',
          'https://github.com/ABDALLAHHFX', 'https://www.linkedin.com/in/abdullahi-mustapha-053898359?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'cfecfca4-1a8c-4564-a9f1-000aa7343ecb', '6bbcb7ce-dcaf-4414-947e-704422d0824b',
          'Muhammad Sadis Isa', 'muhammad-sadis-isa',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08031852961', 'muhammadsadis@gmail.com',
          10, 'Java,.NET,Python,Next.js,TypeScript,React Native,LLM Apps,GitHub Actions,MySQL,mTLS,Postman,Project Management Skills', 'Java,Python,TypeScript', NULL,
          'https://github.com/muhammadsadisisa', 'https://www.linkedin.com/in/muhammad-sa dis-pmp@-ssybp-9634142a0', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Product Management' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '4cfdd718-f3f3-49e5-ae10-fc70b09dc069', 'b3600eaa-85dc-4b13-a0e3-b9aecdb365b8',
          'Salisu Umar', 'salisu-umar',
          'Gombe state', 'Nigeria', 'Africa/Lagos',
          '08036304301', 'salisukumo1@gmail.com',
          2, 'Go,Java,Python,Next.js,TypeScript,Flutter,Kotlin,Python (Data),Spark,Airflow,LLM Apps,Kubernetes,GitHub Actions,MySQL,MongoDB,OAuth2/OIDC,Vulnerability Mgmt,SIEM/SOC,Playwright,Postman', 'Java,Go,Python,TypeScript,Kotlin', 'APIs (REST)',
          'https://github.com/TMD01', 'https://www.linkedin.com/in/salisuumar/', 'https://ct-realestate.web.app/',
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '27f73d6d-9429-4ebf-aff4-45a33b064c45', '0950a929-2c32-42b3-b671-e9c6b1f10772',
          'Aladeloye Joshua', 'aladeloye-joshua',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '+2349169612297', 'ace.dexigns@gmail.com',
          3, 'Node.js,Python,React,Flutter,Python (Data),Docker,PostgreSQL,MySQL,SIEM/SOC,Postman,Cybersecurity Analyst
UI UX Designer
Graphic Designer
Data Analyst and Researcher', 'Python', NULL,
          'https://github.com/Al3hemy', 'https://www.linkedin.com/aladeloye-joshua', 'https://www.behance.net/UI-josh',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '9e4ae4da-afc2-40b1-880c-e96a97943ac6', '2364001b-f19c-4664-a498-28fc2a3ba49f',
          'Ahmed Bashir Ribadu', 'ahmed-bashir-ribadu',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08090906919', 'tjbashiribadu@gmail.com',
          9, 'Node.js,Java,Python,React,Next.js,Vue,TypeScript,Flutter,React Native,Python (Data),Docker,Kubernetes,PostgreSQL,MySQL,MongoDB,Redis,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Postman,Building AI models,Fullstack Development,Penetration Testing', 'Node.js,Java,Python,TypeScript', 'APIs (REST),Performance tuning',
          'https://github.com/SpiderBrown', 'https://www.linkedin.com/in/ahmedribadu/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f23501d4-dc0b-4499-88c5-a27c01613b1a', 'ec38a578-f5ae-4402-9789-d475f89e8fa7',
          'Haliru Aliyu Aliyu', 'haliru-aliyu-aliyu',
          'Sokoto', 'Nigeria', 'Africa/Lagos',
          '08069442088', 'abbahali01@gmail.com',
          12, 'Java,Python,TypeScript,Flutter,Python (Data),GitHub Actions,PostgreSQL,Vulnerability Mgmt,Playwright', 'Java,Python,TypeScript', NULL,
          'https://github.com/Aerlee07', 'https://www.linkedin.com/in/haliru-aliyu-aliyu-86bb081b0?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '1410f59d-c715-4cfe-a576-5776b29deef5', 'ecf5a9d0-a636-4441-bc62-87cae63673e1',
          'Anas Yunusa Adamu', 'anas-yunusa-adamu',
          'Taraba State', 'Nigeria', 'Africa/Lagos',
          '08086777408', 'anasnguroje@gmail.com',
          8, 'Node.js,Python,React,Flutter,React Native,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,Terraform,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Postman', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/ANAS-Y', 'https://www.linkedin.com/in/anas-yunusa/', 'https://www.newsky.com.ng/anas',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '22e71edf-19d6-4bf8-bb18-5d9c6e0d922a', '4e266e77-c2b9-44bf-b1cb-9f259fc19ecd',
          'ANAS ADAMU KABIR', 'anas-adamu-kabir',
          'DUTSE', 'Nigeria', 'Africa/Lagos',
          '07031868355', 'aadamukabeer09@gmail.com',
          3, 'Go,Java,.NET,React,TypeScript,Flutter,Swift,Python (Data),Spark,Airflow,ML Ops,GitHub Actions,MySQL,Kafka,Vulnerability Mgmt,Playwright,Go test', 'Go,Java,TypeScript,Swift,Python', NULL,
          'https://github.com/Aakabeer/Aakabeer.git', 'https://linkedin.com/in/anasadamukabir', NULL,
          'two_three_months', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'e4e89e10-a885-4d69-8850-a72e789a80ac', '5d14f5d7-ee31-4a9e-b1ac-0a6b763523e1',
          'Fatima Ibrahim baba', 'fatima-ibrahim-baba',
          'Yola', 'Nigeria', 'Africa/Lagos',
          '8161766594', 'fatybaba1803@gmail.com',
          2, 'Java,.NET,TypeScript,Swift,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Go test', 'Java,TypeScript,Swift,Python', NULL,
          'https://github.com/Fridosoj', 'https://linkedin.com/in/destiny-kay-4ab094217', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '23255b3c-8b00-4a8f-aeec-e64348be45b1', 'ee4ceb54-49fc-41b0-8271-f1e15da91e3e',
          'Udoh Timothy Augustine', 'udoh-timothy-augustine',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08168214500', 'udoh.timothy@yahoo.com',
          4, 'Node.js,Python,React,Next.js,TypeScript,React Native,Python (Data),Docker,Kubernetes,PostgreSQL,MySQL,OAuth2/OIDC,Vulnerability Mgmt,Postman,Go test', 'Python,TypeScript', 'Design systems,Component libraries,State management',
          'https://github.com/Zye-design', 'https://www.linkedin.com/in/timothy4udoh', 'https://zye-portfolio.netlify.app',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b6bae22b-222c-4cbc-8423-db3f967fe8f0', '3b8b777a-c0ff-4919-82cd-9b7be35ff82b',
          'ABDULLAHI ABDURRAHMAN', 'abdullahi-abdurrahman',
          NULL, 'Nigeria', 'Africa/Lagos',
          '07067892970', 'aakenewee760@gmail.com',
          3, 'Python,TypeScript,Flutter,Python (Data),Kubernetes,GitHub Actions,MongoDB,OAuth2/OIDC,mTLS,Cypress,JUnit', 'Python,TypeScript', 'Design systems',
          'https://github.com/abdullahi.abdurrahman', 'https://www.linkedin.com/aaharuna', NULL,
          'immediate', 'remote',
          '10:00', '18:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ca9b175a-ba8f-4d95-b4d3-27e601a32ab8', '0b4c2c36-78c8-4e0a-a749-a771218caa41',
          'Opeoluwa Odanye', 'opeoluwa-odanye',
          'Lagos WAT', 'Nigeria', 'Africa/Lagos',
          '08141199030', 'opeoluwaodanye@gmail.com',
          5, 'Python,React,React Native,Python (Data),GitHub Actions,PostgreSQL,OAuth2/OIDC,Playwright', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/OpeoluwaO', 'https://www.linkedin.com/in/opeoluwa-o-odanye-69356610b/?isSelfProfile=true', NULL,
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '7ff39171-3caf-4207-9d2c-b9da6845c8fb', '3aea164c-c68f-4730-97fc-5b65a9ae2dbc',
          'Jamilu Mustapha Mustapha', 'jamilu-mustapha-mustapha',
          'Katisna', 'Nigeria', 'Africa/Lagos',
          '09030763077', 'jamilumustapha.m@gmail.com',
          2, 'Node.js,Java,Python,React,TypeScript,Flutter,Swift,Python (Data),ML Ops,LLM Apps,Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,Vulnerability Mgmt,SIEM/SOC,Playwright,JUnit', 'Java,Python,TypeScript,Swift', 'Data pipelines (e.g.,Spark/Airflow),LLM Apps (RAG/Agents)',
          'https://github.com/Mustaphajameel/lab-agile-planning', 'https://www.linkedin.com/in/jamilu-mustapha-mustapha-1bb326252?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', NULL,
          'immediate', 'hybrid',
          '08:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '66666aee-a99f-4c35-90cc-40fc6dbba792', '238b6591-5b8b-4830-b801-2339d95b569f',
          'Najib Umar Lawan', 'najib-umar-lawan',
          'Kano Nigeria', 'Nigeria', 'Africa/Lagos',
          '07031643351', 'najeebumarlawan02@gmail.com',
          3, 'Python,TypeScript,Kotlin,Python (Data),Docker,PostgreSQL,MySQL,OAuth2/OIDC,Vulnerability Mgmt,SIEM/SOC,Postman,Experience in cybersecurity and ethical hacking,including vulnerability assessment,security analysis,networking,and exposure to SOC-related concepts. Interested in advancing hands-on and enterprise-level security skills.', 'Python,TypeScript,Kotlin', NULL,
          'https://github.com/Najeebumar/NITDA-TRAINING', 'https://www.linkedin.com/in/najib-lawan-620462361/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'dbc86954-1579-41e5-a470-06aa530b5824', '0c8af1ea-a26b-42b4-85ed-32b882fb68b1',
          'Ebiloma Israel', 'ebiloma-israel',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08160240867', 'ebilomaisrael@gmail.com',
          5, 'Python,React,Swift,Python (Data),ML Ops,GitHub Actions,PostgreSQL,MySQL,SIEM/SOC,Go test,Spreadsheet,Power bi,Tableau', 'Python,Swift', 'Data pipelines (e.g.,Spark/Airflow),Data warehousing/lakes',
          'https://github.com/israelebiloma', 'https://www.linkedin.com/in/israelebiloma', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '14e776e3-db7d-48e2-b88f-bfffecea691c', 'a9551272-89e3-4a07-86db-2f478eb9e877',
          'Onofiok Ekong', 'onofiok-ekong',
          NULL, 'Nigeria', 'Africa/Lagos',
          '09023170886', 'ekongonofiok93@gmail.com',
          4, 'Node.js,Python,React,React Native,Python (Data),Docker,PostgreSQL,MySQL,OAuth2/OIDC,Postman,Video editing', 'Python', 'APIs (REST)',
          'https://github.com/ono4iok', 'https://linkedin.com/in/onofiok-ekong-4ba9a8279?trk=people-guest_people_search-card', 'https://ono4iok.github.io/onoportfolio/',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'b7e5c5ed-c483-4b35-a3d3-2ac324bae8e4', 'cad9a568-fccf-4c62-b88d-0821803b70b7',
          'ABDURRAHMAN IDRIS', 'abdurrahman-idris',
          'Nigeria (WAT', 'Nigeria', 'Africa/Lagos',
          '08086018608', 'abdurrahmaneedrees@gmail.com',
          4, 'Python,React,TypeScript,Kotlin,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,OAuth2/OIDC,Vulnerability Mgmt,Postman,SYS Admin', 'Python,TypeScript,Kotlin', 'APIs (REST)',
          'https://github.com/AbdurrahmanIdr', 'https://www.linkedin.com/in/abdurrahman-idris-0198-585340107/', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'fd28e599-ab93-4e85-89e7-059c5066aab2', 'b8aff3a5-4575-41cb-ad96-4ec47998f6fb',
          'Mgboawaji-ogak Jonah Oke', 'mgboawaji-ogak-jonah-oke',
          'Port Harcourt', 'Nigeria', 'Africa/Lagos',
          '08064422006', 'okemgboawaji@gmail.com',
          4, 'Java,Python,React,Next.js,Kotlin,Python (Data),GitHub Actions,PostgreSQL,MySQL,Vulnerability Mgmt,Postman', 'Java,Python,Kotlin', NULL,
          'https://github.com/dashboard', 'https://www.linkedin.com/feed/?nis=true&&lipi=urn%3Ali%3Apage%3Ad_flagship3_messaging_conversation_detail%3BK1y8ZCg%2FTd2UPgAFMWWF4A%3D%3D', 'https://www.kaggle.com/okejonah',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '1445c39b-cc50-4e7a-94da-7aa03528e29b', '16864a7c-25a4-4fa2-8966-43b1289fb224',
          'Mohammed Hamzah Kari', 'mohammed-hamzah-kari',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08154547951', 'hamzahmuhammad247@gmail.com',
          2, 'Python,React,Vue,TypeScript,Flutter,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Playwright', 'Python,TypeScript', 'LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/harmzed', 'https://www.linkedin.com/in/hamzah-mohammed-kari', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '1f939602-4a78-479c-a534-ff58d2198bc1', 'c9eecc21-45f4-4cf4-9cca-903df9de8e71',
          'Oyebamiji Janet Temitope', 'oyebamiji-janet-temitope',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08105451644', 'janetoye235@gmail.com',
          1, 'Java,Python,TypeScript,Flutter,Kotlin,Python (Data),Terraform,GitHub Actions,PostgreSQL,MySQL,Vulnerability Mgmt,Go test', 'Java,Python,TypeScript,Kotlin', 'Helm,GitHub Actions',
          'https://github.com/Oyebamiji234', 'https://www.linkedin.com/in/janet-oyebamiji-temitope-05973929b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'DevOps & Cloud' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'e29a9c7f-a332-482a-aab4-49e26bed8f05', 'aa6bdad8-3a56-4fa7-8e41-d1f1dcf31c53',
          'Daniel Elijah Dibal', 'daniel-elijah-dibal',
          'Masaka', 'Nigeria', 'Africa/Lagos',
          '09034349525', 'danielelijah17@gmail.com',
          1, 'Go,TypeScript,Flutter,Spark,GitHub Actions,ArgoCD,MySQL,Vulnerability Mgmt,SIEM/SOC,Go test', 'Go,TypeScript', NULL,
          'https://github.com/danski', 'https://www.linkedin.com/in/daniel-elijah-dibal-94b8111ab?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '627614c7-a353-4b9a-abd0-406d009a3ab2', '18636bc1-1e83-4064-b114-5939cdcc5d2e',
          'Chidinma Miriam Okereke', 'chidinma-miriam-okereke',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08082119077', 'chidinmamiriamokereke@gmail.com',
          4, 'Node.js,React,TypeScript,React Native,Python (Data),GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Postman', 'TypeScript,Python', 'Design systems,Accessibility (WCAG)',
          'https://github.com/mimi-pro', 'https://www.linkedin.com/in/chidinmamiriamokereke?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ab25fb9d-7cdb-4fa9-95ba-343f901ea401', 'e179c29e-fffe-45a4-8e65-4a3cfa3671e0',
          'Nasir Aminu', 'nasir-aminu',
          'Zaria', 'Nigeria', 'Africa/Lagos',
          '07069124864', 'nasiraminu088@gmail.com',
          3, 'Node.js,Python,React,Flutter,Python (Data),Docker,GitHub Actions,MySQL,Vulnerability Mgmt,Cypress', 'Python', 'Performance tuning',
          'https://github.com/nasiraminu099-cell', 'https://www.linkedin.com/in/Nasir Aminu', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5e724bc9-7f09-40b6-9b7a-2816c641b8ea', 'cf86af1c-c2d5-4715-8fa0-bd56ca4671cb',
          'Aminu Abdullahi Dogondaji', 'aminu-abdullahi-dogondaji',
          NULL, 'Nigeria', 'Africa/Lagos',
          '07069938897', 'dogondaajj@gmail.com',
          4, 'Python,React,Swift,LLM Apps,GitHub Actions,MySQL,mTLS,JUnit', 'Python,Swift', 'Data pipelines (e.g.,Spark/Airflow)',
          'https://github.com/ddaji091/Project-', 'https://www.linkedin.com/in/aminu-abdullahi-b9a93743?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '841637ac-27c8-49e6-ad8e-8b9482963d74', '07f96024-c0d5-4f39-aabc-8f526ce8f983',
          'Tijjani Tihallo Vappa', 'tijjani-tihallo-vappa',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08035718162', 'tvappa4u@gmail.com',
          12, 'Go,Java,React,Flutter,Swift,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Playwright,Go test', 'Go,Java,Swift,Python', NULL,
          'https://github.com/pulls', 'https://www.linkedin.com/feed', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a4ebc31e-4e53-4b32-8a6e-b1d8eda10d78', 'ffc8b8be-3782-426e-ba22-d655b401e87c',
          'Aniedi Inyang', 'aniedi-inyang',
          'Abuja WAT', 'Nigeria', 'Africa/Lagos',
          '08100662284', '1greatprestige@gmail.com',
          2, 'Java,React,Flutter,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,Playwright', 'Java,Python', 'APIs (REST)',
          'https://github.com/precoco', 'https://www.linkedin.com/in/aniedi-inyang?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0effff77-4152-4d15-9a53-f27bad59ee6b', '9b793db3-9e5c-4870-b2a5-740b33151b9d',
          'Ferdinand Ekpo', 'ferdinand-ekpo',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '08086960897', 'sirferdyekpo@gmail.com',
          3, 'Python,React,React Native,Python (Data),Spark,LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Postman', 'Python', 'Data pipelines (e.g.,Spark/Airflow),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/Ferdyekpo', 'https://www.linkedin.com/in/ferdinandekpo/', 'https://www.ferdinandekpo.com/',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          'e496e728-19d0-4f61-8218-41267d114d11', 'fdfd07d5-eccb-426f-a23a-cd779e34a00e',
          'Abbas Kyari', 'abbas-kyari',
          'Nigeria (GMT+1)', 'Nigeria', 'Africa/Lagos',
          '08168355566', 'kyariabbas@gmail.com',
          2, 'Node.js,Java,Python,Next.js,Swift,Python (Data),GitHub Actions,MySQL,Vulnerability Mgmt,SIEM/SOC,Playwright', 'Java,Python,Swift', NULL,
          'https://github.com/kyariabba/SUI-workshop.git', 'https://www.linkedin.com/in/abbas-kyari-35a06428b)', NULL,
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Product Management' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5bfe029a-c82a-4091-9f29-fa7a92eaeebd', 'af9818de-534d-4122-99ff-0dfb8ab0bbe2',
          'Lawal Muazu', 'lawal-muazu',
          'Katsina', 'Nigeria', 'Africa/Lagos',
          '07016166294', 'abbamuazulm@gmail.com',
          5, 'Go,Java,Python,TypeScript,Flutter,Swift,Python (Data),Airflow,ML Ops,LLM Apps,Kubernetes,GitHub Actions,PostgreSQL,MongoDB,Kafka,OAuth2/OIDC,Vulnerability Mgmt,SIEM/SOC,Playwright,JUnit,Go test', 'Go,Java,Python,TypeScript,Swift', NULL,
          'https://github.com/abbamuazu16', 'https://www.linkedin.com/in/lawal-muazu-8912a128b?trk=contact-info', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5a3000d5-1248-46e9-8d7e-4bc3ba1094dd', 'c762764d-3908-443d-b18a-12321642e069',
          'Abbas Ahmad', 'abbas-ahmad',
          '2:07', 'Nigeria', 'Africa/Lagos',
          '07069986220', 'abbasasulaiman11@gmail.com',
          9, 'Node.js,Java,Python,Next.js,TypeScript,Flutter,Kotlin,Python (Data),ML Ops,Docker,GitHub Actions,MySQL,MongoDB,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress', 'Java,Python,TypeScript,Kotlin', 'Design systems',
          'https://github.com/Avversahmerdu', 'https://www.linkedin.com/Avversahmerdu', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3f2e55ff-a79d-4f16-aae6-7f3674f660bd', 'f6b042f0-8e06-4dba-8a37-9e39eebfb951',
          'Njoku Okechukwu Valentine', 'njoku-okechukwu-valentine',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '07038616871', 'bonsoirval@gmail.com',
          4, 'Python,React,Kotlin,Python (Data),ML Ops,Docker,GitHub Actions,PostgreSQL,MySQL,SIEM/SOC,Postman', 'Python,Kotlin', 'Data pipelines (e.g.,Spark/Airflow)',
          'https://github.com/bonsoirval/', 'https://www.linkedin.com/in/njoku-okechukwu-val/', 'https://github.com/bonsoirval/portfolio/',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '1a27159b-ee1f-443c-89ed-2ac87957a8a4', '2acb19d1-2aef-43e0-bb2c-9b36a99a0f39',
          'ZIYAU SIRAJO', 'ziyau-sirajo',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08033489614', 'ziyaulhaqsurajo@yahoo.com',
          11, 'Go,Node.js,Java,.NET,Python,Rust,React,Next.js,Vue,TypeScript,React Native,Kotlin,Swift,Spark,Airflow,ML Ops,LLM Apps,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,MySQL,MongoDB,Redis,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,Go test', 'Python,Go,Java,Rust,TypeScript,Kotlin,Swift', 'APIs (REST),gRPC,Concurrency patterns,Performance tuning',
          'https://github.com/ZIYAULHAQ1', 'https://www.linkedin.com/in/engr-ziyau-sirajo-22ba15171?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '48fc39f6-daa7-41df-8ed2-1ffb7db55e5f', '0c40d51e-4fde-4737-b634-7db215bd9134',
          'Augustine Simon Chimamkpam', 'augustine-simon-chimamkpam',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '0802 677 3090', 'bezerine@hotmail.com',
          3, 'Java,Python,Rust,React,Vue,TypeScript,Flutter,Swift,Python (Data),Spark,Airflow,Docker,GitHub Actions,MySQL,Redis,mTLS,SIEM/SOC,Playwright,Cypress,Go test', 'Java,Python,Rust,TypeScript,Swift', NULL,
          'https://github.com/Bezerine', 'https://www.linkedin.com/in/bezerine?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '512feeac-9d4f-49b4-81f6-f6d8820faea8', '2c34d1dc-c7e3-4dc2-bcc6-81d7f64b7972',
          'Basheer Remilekun Muftau', 'basheer-remilekun-muftau',
          'Abuja +1WAT', 'Nigeria', 'Africa/Lagos',
          '08101585478', 'basheerremilekun@gmail.com',
          4, 'Python,TypeScript,Flutter,Python (Data),Kubernetes,MySQL,Vulnerability Mgmt,SIEM/SOC,Go test', 'Python,TypeScript', NULL,
          'https://github.com/youngpioneer1', 'https://www.linkedin.com/in/basheer-remilekun-muftau-38b3a5164?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'e5d6230c-0e04-4694-91a4-e42f7f041a74', '43eeb28a-7a3a-4f11-b72c-08541f283e2a',
          'Arji Christian Chijioke', 'arji-christian-chijioke',
          'Lagos Nigeria', 'Nigeria', 'Africa/Lagos',
          '08060070833', 'mcdre1995@gmail.com',
          3, 'Python,TypeScript,Flutter,Python (Data),GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Postman', 'Python,TypeScript', 'Data pipelines (e.g.,Spark/Airflow),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/Mcdre1995', 'https://www.linkedin.com/in/arji-christian-4667901a1', 'https://github.com/Mcdre1995',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'cc9e8bfd-1432-4fae-ab56-0e1c10c49d52', 'f1226325-de5e-4beb-a450-3d99257d02ee',
          'Marian Aphiare', 'marian-aphiare',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08111114413', 'marianaphiare@gmail.com',
          12, 'Node.js,React,Next.js,Flutter,Python (Data),Spark,Airflow,LLM Apps,Docker,Terraform,GitHub Actions,MySQL,MongoDB,OAuth2/OIDC,Vulnerability Mgmt,Postman,Microsoft Word,Excel & PowerPoint
Google Workspace
Data Entry & Management
Document Preparation
Stakeholders Support
Record Keeping
Problem Solving
Communication & Teamwork', 'Python', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://github.com/marykevwe', 'https://www.linkedin.com/in/marian-aphiare?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f52cf530-4d9b-49a5-a189-0156449a4312', 'af92ecef-ffaa-4b50-bb60-9ab158a3794a',
          'Ayana Terkimbi Daniel', 'ayana-terkimbi-daniel',
          'Makurdi', 'Nigeria', 'Africa/Lagos',
          '07081491797', 'terkimbiayana5@gmail.com',
          1, 'Java,Python,Vue,Flutter,React Native,Swift,Python (Data),Airflow,LLM Apps,GitHub Actions,MySQL,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Go test', 'Java,Python,Swift', 'Data pipelines (e.g.,Spark/Airflow),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/gerd200', 'https://www.linkedin.com/in/ ayana-daniel-09972923b', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5da0e2fc-a4ac-4ed7-8277-a8d54cdfcab2', '1d464c28-435a-4f68-97b5-7068e0623be2',
          'Sadiq Usman', 'sadiq-usman',
          'Kaduna', 'Nigeria', 'Africa/Lagos',
          '09035327593', '1sadiqusman@gmail.com',
          3, 'Node.js,Java,.NET,Python,Next.js,TypeScript,Flutter,Swift,Python (Data),Airflow,LLM Apps,Docker,Terraform,GitHub Actions,PostgreSQL,MySQL,Redis,OAuth2/OIDC,SIEM/SOC,Playwright,Go test', 'Java,Python,TypeScript,Swift', NULL,
          'https://github.com/Sbodafta/Sbodafta', 'https://www.linkedin.com/in/sadiq-usman-85508124a?trk=contact-info', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3a0b223b-f339-4f90-9663-e3fe0be98b80', '00f35cc3-1353-4ec3-bab5-bba79a9a0400',
          'Onome Favour Omoegbeleghan', 'onome-favour-omoegbeleghan',
          'Port Harcourt', 'Nigeria', 'Africa/Lagos',
          '08125663935', 'fayvhurchristopher@gmail.com',
          1, 'Python,React,Flutter,Python (Data),Docker,PostgreSQL,MySQL,OAuth2/OIDC,Playwright', 'Python', 'Data warehousing/lakes',
          'https://www.github.com/in/onome-omoegbeleghan', 'https://www.linkedin.com/in/onome-omoegbeleghan', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a801dcdc-db53-4d38-b66e-3ab7fbdf4a9d', '0200c67a-bc9d-4c55-95b9-180a51e9ccde',
          'Abba Hussaini', 'abba-hussaini',
          'Hadejia', 'Nigeria', 'Africa/Lagos',
          '08023719359', 'abbahussaini123@gmail.com',
          2, 'Node.js,Java,Python,React,TypeScript,Flutter,Python (Data),Spark,ML Ops,LLM Apps,Docker,Terraform,GitHub Actions,PostgreSQL,MySQL,Kafka,Elastic,OAuth2/OIDC,Vulnerability Mgmt,Playwright,Cypress,Postman', 'Java,Python,TypeScript', NULL,
          'https://github.com/users/Abbahussayn/projects/1', 'https://www.linkedin.com/public-profile/settings', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'dc113a28-a511-4ce5-97c1-e29e856969d4', '217ea68b-06eb-49f1-a3b7-9563582abe3b',
          'Ijiwade James Oluwafemi', 'ijiwade-james-oluwafemi',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '07063073339', 'ijiwadejames@gmail.com',
          4, 'Node.js,React,React Native,Python (Data),Docker,MySQL,MongoDB,OAuth2/OIDC,Postman,PHP,JAVASCRIPT', 'Node.js,Python', 'APIs (REST)',
          'https://github.com/ijiwadejames', 'https://www.linkedin.com/in/jamesijiwade', 'https://thrivetopacademy.com,  https://xseler.com, https://eco-oasis.org',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'cc88388a-084b-42c4-b3c1-45963bc829d1', '6a17880a-02b1-4965-90f0-6df792ff6605',
          'Lucky Alade', 'lucky-alade',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08149746576', 'luckyalade309@gmail.com',
          4, 'Node.js,Python,React,Next.js,TypeScript,React Native,Python (Data),Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Postman', 'Python,TypeScript', 'Design systems,Component libraries,State management,Accessibility (WCAG)',
          'https://github.com/luckyalade', 'https://www.linkedin.com/in/luckyalade', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '838e5df0-0ace-45fd-a011-5eb2f1889d49', '7b0e48e7-695a-4910-9d2e-0704c8cbe089',
          'Doyin Somoye', 'doyin-somoye',
          'Lagos Nigeria', 'Nigeria', 'Africa/Lagos',
          '08033477065', 'abikesomoye@gmail.com',
          10, 'Python,React,Flutter,Python (Data),Airflow,Docker,PostgreSQL,MySQL,OAuth2/OIDC,Postman', 'Python', 'Data pipelines (e.g.,Spark/Airflow),Data warehousing/lakes',
          'http://github.com/abikesomoye@gmail.com', 'http://linkedin.com/in/doyin-abike-somoye', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '30b86390-a5b7-4003-a4e3-fcf2bdc60c5a', 'ea2c6c00-7b1b-40b1-afee-ee33f174c527',
          'Mohammed Nabil Abubakar', 'mohammed-nabil-abubakar',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08163399932', 'nabilkabirumohammed@gmail.com',
          2, 'Node.js,Java,Python,React,Next.js,TypeScript,Flutter,React Native,Swift,Python (Data),Docker,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Cypress,Postman', 'Java,Python,TypeScript,Swift', 'Design systems,Component libraries,State management',
          'https://github.com/Mnet007', 'https://www.linkedin.com/in/mohammed-nabil-abubakar/', 'https://nabil-site.vercel.app/',
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd6214570-163c-46aa-87e8-fb9c2920942f', 'eb812656-29a5-4c74-a831-79bb31155dd7',
          'Idris Mohammed Panti', 'idris-mohammed-panti',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08067755275', 'eedrispanti@gmail.com',
          6, 'Go,Node.js,Java,.NET,Python,Rust,React,Next.js,Vue,TypeScript,Flutter,React Native,Kotlin,Swift,Python (Data),Spark,Airflow,ML Ops,LLM Apps,Docker,Kubernetes,Terraform,Helm,GitHub Actions,ArgoCD,PostgreSQL,MySQL,MongoDB,Redis,Kafka,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,JUnit,Go test', 'Go,Java,Python,Rust,TypeScript,Kotlin,Swift', NULL,
          'https://github.com/Risthehunter/Idris', 'https://www.linkedin.com/in/idris-mohammed-350a1b1b7/', 'https://sites.google.com/view/idrismpanti/',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Product Management' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '7bdee7ed-3335-4021-8537-eed4ef0df088', '38e43660-4a01-4ae6-a86a-3bd5c2f0d5db',
          'Victor David Sarkibaka', 'victor-david-sarkibaka',
          'Maitama', 'Nigeria', 'Africa/Lagos',
          '09036471936', 'victor.baka16@gmail.com',
          6, 'Python,Next.js,Kotlin,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,Elastic,Vulnerability Mgmt,SIEM/SOC,Go test,KQL,Forensic Analysis', 'Python,Kotlin', NULL,
          'https://github.com/vdavidanalyst', 'https://www.linkedin.com/in/victor-david-sarkibaka', 'https://vdavidanalyst.github.io/vdavidanalyst2.github.io/',
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3ba77a0f-c0fb-445b-b433-319a30c3bad0', 'fbe6d68f-fdad-4a3e-9aed-4c3626b4a1ba',
          'Jibilla Shadrach Masoyi', 'jibilla-shadrach-masoyi',
          'West Africa Time (WAT)', 'Nigeria', 'Africa/Lagos',
          '+2348133369152', 'bobdariddle@gmail.com',
          5, 'Python,React,Flutter,Python (Data),GitHub Actions,PostgreSQL,MySQL,SIEM/SOC,Go test', 'Python', 'LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/Jibilla-shadrachMasoyi/Jibilla-shadrachMasoyi', 'https://www.linkedin.com/in/jibillashadrachmasoyi?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5edc8f5b-4178-4ac8-964d-17cc637c9e06', 'f16f44c0-86db-47e1-8be0-19f75c651829',
          'Nafisat Sanusi', 'nafisat-sanusi-1',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08035622282', 'nafisatfaruk5@mail.com',
          5, 'Java,Python,React,Next.js,TypeScript,React Native,Python (Data),LLM Apps,Docker,GitHub Actions,PostgreSQL,MySQL,OAuth2/OIDC,Playwright,Cypress,Postman,JUnit', 'Java,Python,TypeScript', 'APIs (REST)',
          'https://github.com/phyya', 'https://www.linkedin.com/in/nafisat-sanusi', 'https://nafisat-sanusi.vercel.app',
          'one_month', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3e1baf31-ae8e-41d4-b7f8-71def2b5708b', '2c42fead-a795-4fca-b4f4-80ccb6b85c13',
          'Samuel Joseph', 'samuel-joseph',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07040157770', 'sjstixx@gmail.com',
          1, 'Node.js,Java,Next.js,Flutter,Python (Data),GitHub Actions,MySQL,MongoDB,OAuth2/OIDC,SIEM/SOC,Postman', 'Java,Python', 'Design systems',
          'https://github.com/sjstixx', 'https://www.linkedin.com/in/samuel-joseph-a80b4a3a9', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '55411a36-9836-4276-8a76-e55b7f6e3507', '964b5eb3-6907-4c0d-9cfe-99c40c10a552',
          'Mohammed saad', 'mohammed-saad',
          'Yola', 'Nigeria', 'Africa/Lagos',
          '8064516497', 'kabirmuhammad299@gmail.com',
          5, 'Java,TypeScript,Flutter,ML Ops,GitHub Actions,PostgreSQL,mTLS,Go test', 'Java,TypeScript', NULL,
          'https://github.com/kabirmuhammad299-dev', 'https://www.linkedin.com/onboarding/start/profile-edit/new/?source=coreg', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3a86277a-5183-4d39-8c5f-ccc9af84342a', 'c383e160-c6cf-4a4f-a2b3-5805653997b4',
          'Abubakar Yau Gimba', 'abubakar-yau-gimba',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08067063568', 'abubakargimba62@gmail.com',
          3, 'Python,TypeScript,Flutter,LLM Apps,Docker,Elastic,SIEM/SOC,Go test', 'Python,TypeScript', NULL,
          'https://github.com/abubakargimba62-lgtm', 'https://www.linkedin.com/in/abubakar-ya-u-gimba-1b6bbb121/', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'dcbf6b67-fe59-42c2-92e6-0ad50f1dc295', '1dfcf4a0-d8cb-46b6-b11b-7bd7e7486976',
          'Abdulkadir abubakar', 'abdulkadir-abubakar',
          'Maiduguri', 'Nigeria', 'Africa/Lagos',
          '08138726661', 'aabdulkadir199@gmail.com',
          3, 'Java,Python,React,TypeScript,React Native,Kotlin,Python (Data),LLM Apps,GitHub Actions,PostgreSQL,MySQL,MongoDB,mTLS,Vulnerability Mgmt,Playwright,Cypress', 'Java,Python,TypeScript,Kotlin', NULL,
          'https://github.com/Abdu4dr/Abdul.git', 'https://www.linkedin.com/in/abdulkadir-abubakar-2122921ab?utm_source=share_via&utm_content=profile&utm_medium=member_android', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f2a2319b-3ac2-4709-ac2d-6a5d9dc5482a', '6416018b-9637-4737-9b68-303fe628d711',
          'Abbas Muhammad', 'abbas-muhammad',
          'Kaduna', 'Nigeria', 'Africa/Lagos',
          '07038469525', 'abbasmuhammad959.am@gmail.com',
          5, 'Java,Vue,Flutter,Python (Data),GitHub Actions,Elastic,mTLS,Postman', 'Java,Python', NULL,
          'https://github.com/abbasmuhammad959am-sys', 'https://www.linkedin.com/in/abbas-muhammad-8018b0210?trk=contact-info', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd695d70a-ee60-4fd3-8263-375f90113bdd', '181773e8-7158-43ff-ad6b-4cc54db2a86b',
          'Aliyu Saidu', 'aliyu-saidu',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '+2348065795987', 'aliyu.saidu8438@yahoo.com',
          2, 'Node.js,Python,React,Flutter,React Native,Python (Data),GitHub Actions,MongoDB,SIEM/SOC,Postman,I am a frontend developer (HTML,CSS,JavaScript,React Js)', 'Python', 'State management',
          'https://github.com/Aliyu-Saidu', 'https://www.linkedin.com/Aliyu-Saidu', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f7604b15-c775-4a1d-beb0-8a72333ad89c', 'eb74e2e7-1f9a-4f3e-a965-6f595e49f7f9',
          'Shehu Isah', 'shehu-isah',
          'Bauchi', 'Nigeria', 'Africa/Lagos',
          '07038857389', 'fadasgazah@gmail.com',
          9, 'Python,Next.js,TypeScript,Flutter,Swift,Python (Data),LLM Apps,GitHub Actions,PostgreSQL,MySQL,MongoDB,Vulnerability Mgmt,SIEM/SOC,Playwright,Go test,R,SPSS,Excel', 'Python,TypeScript,Swift', NULL,
          'https://github.com/fadasgazah/TestRepo.git', 'https://www.linkedin.com/in/shehu-isah-1b2811113', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f8c10a6c-52cf-431a-85ea-117ff5a26a46', 'b04a30e3-a26b-4d07-bd3c-09f41421dda3',
          'Musa Bashir Bebeji', 'musa-bashir-bebeji',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08031871319', 'abbabebeji01@gmail.com',
          5, 'Go,Java,.NET,Python,TypeScript,Flutter,Swift,Python (Data),Spark,Docker,Terraform,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,mTLS,SIEM/SOC,Playwright,Cypress,Postman,Go test', 'Go,Java,Python,TypeScript,Swift', NULL,
          'https://github.com/Bebeji', 'https://www.linkedin.com/in/musa-bebeji-152622161', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5b85cf44-7beb-42f7-aea8-f3b1576f8b09', '51062906-5c18-426b-890c-2dacaef0330e',
          'Abdullahi Abubakar Aliyu', 'abdullahi-abubakar-aliyu',
          'Nigeria Time Zone: West Africa Time (WAT)', 'Nigeria', 'Africa/Lagos',
          '07062138513', 'aaliyu30@gmail.com',
          5, 'Java,Python,React,TypeScript,Flutter,Swift,Python (Data),Docker,MySQL,MongoDB,SIEM/SOC,Playwright', 'Java,Python,TypeScript,Swift', NULL,
          'https://github.com/Aaliyu3000', 'https://www.linkedin.com/in/abubakar-aliyu-0310b6132?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '873927bc-e713-4098-aa04-3dbc7c71df0f', 'bb662b60-1da2-438f-90d4-e51f9e70bd87',
          'Hayatullahi Bolaji Adeyemo', 'hayatullahi-bolaji-adeyemo',
          NULL, 'Nigeria', 'Africa/Lagos',
          '08069295003', 'hayatu4islam@yahoo.com',
          12, 'Node.js,Java,Python,React,Flutter,React Native,Python (Data),Docker,PostgreSQL,MySQL,MongoDB,SIEM/SOC,Postman', 'Java,Python', 'Data pipelines (e.g.,Spark/Airflow),LLM Apps (RAG/Agents)',
          'https://github.com/hayatu4islam', 'https://www.linkedin.com/in/hayat-a-4a049034/', NULL,
          'two_three_months', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'c4a331ad-9de0-4f1b-bfb3-31713f8dc102', '1e59ff9f-0b91-4f83-9f25-cb665d021094',
          'Nseabasi Emmanuel Ekanem', 'nseabasi-emmanuel-ekanem',
          'Abuja Nigeria', 'Nigeria', 'Africa/Lagos',
          '08028791004', 'ekanem.nseabasi@gmail.com',
          4, 'Python,React,Flutter,Python (Data),LLM Apps,Helm,MySQL,OAuth2/OIDC,Playwright', 'Python', NULL,
          'https://github.com/Nseabasi1989/Trinity-', 'https://linkedin.com/in/nseabasi-ekanem', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'd35fe1aa-187a-4990-ab25-cb50cf1cb3f9', 'dd564226-50e4-43e1-b153-fc1986b4e701',
          'Usman Aliyu', 'usman-aliyu-1',
          'Mani LG', 'Nigeria', 'Africa/Lagos',
          '08064121110', 'abbahusumm@gmail.com',
          4, 'Go,Python,React,TypeScript,Flutter,React Native,Swift,Python (Data),ML Ops,LLM Apps,Docker,Helm,GitHub Actions,MySQL,MongoDB,Elastic,OAuth2/OIDC,mTLS,SIEM/SOC,Playwright,Postman,Crypto Trader', 'Python,Go,TypeScript,Swift', 'APIs (REST)',
          'https://github.com/Usmanaliyugambo', 'https://www.linkedin.com/in/aliyuusman', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '240082eb-e250-47dc-a800-5de66b548443', '05a9e57b-9bd3-45fb-a8cb-a249a22b1787',
          'Abdulmalik Abdurrahman Abdulkadir', 'abdulmalik-abdurrahman-abdulkadir',
          'Kano', 'Nigeria', 'Africa/Lagos',
          '08066571737', 'aaakanoglobal@gmail.com',
          10, 'Go,Java,Python,React,TypeScript,Flutter,Swift,LLM Apps,GitHub Actions,MongoDB,Vulnerability Mgmt,Go test', 'Go,Java,Python,TypeScript,Swift', NULL,
          'https://github.com/abdulmalikmaikalwa/Data-security-in-computing-system-', 'https://www.linkedin.com/abdulmalikmaikalwa', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '8e31abb5-5853-48a6-aafa-11780ad1cad4', '08c4794a-5bd9-4f20-8858-28b850476048',
          'AMINU ABDULLAHI CHIROMARI', 'aminu-abdullahi-chiromari',
          '700104', 'Nigeria', 'Africa/Lagos',
          '08030882296', 'aminuamfax@gmail.com',
          3, 'Go,Java,React,TypeScript,React Native,Swift,Spark,Airflow,ML Ops,LLM Apps,Docker,GitHub Actions,MongoDB,Vulnerability Mgmt,Go test,Project management and product management', 'Go,Java,TypeScript,Swift', 'Terraform,GitHub Actions',
          'https://github.com/Amfax', 'https://www.linkedin.com/public-profile/settings?trk=public-profile', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'DevOps & Cloud' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '4094f3ea-f588-4de9-904e-32a60aaa2f7f', '46bc09cc-621f-4a30-ba43-bfa7886208df',
          'Onyinye Grace Edeh', 'onyinye-grace-edeh',
          'Anambra state', 'Nigeria', 'Africa/Lagos',
          '07032660630', 'antyonyinye@gmail.com',
          19, 'Java,Python,Vue,TypeScript,Flutter,Swift,Python (Data),Spark,Docker,PostgreSQL,MySQL,Vulnerability Mgmt,Postman,Go test', 'Java,Python,TypeScript,Swift', NULL,
          'https://github.com/onyinye-grace-edeh', 'https://www.linkedin.com/in/onyinye-grace-edeh-4bb898271', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'ea1313ad-9747-49af-88b5-5d30d4f8d2ba', '1cd30c84-32e3-408d-ba5f-360ea4635bb9',
          'Mashud Siyaka Etudaye', 'mashud-siyaka-etudaye',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '09026085117', 'mashudetudaye@gmail.com',
          3, 'Python,React,Kotlin,LLM Apps,Docker,GitHub Actions,PostgreSQL,MongoDB,Redis,OAuth2/OIDC,Vulnerability Mgmt,Postman', 'Python,Kotlin', 'GitHub Actions',
          'https://github.com/mashudetudaye-lang', 'https://www.linkedin.com/in/mashud-siyaka-etudaye-9a3081328', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'DevOps & Cloud' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '3d213cf3-1c3a-4971-8a51-dc6f1bfc683b', '02da81da-0d93-48c5-9fdf-c77b1b869716',
          'CALEB ADEKUNLE', 'caleb-adekunle',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '+2347016602771', 'alkebulantech@gmail.com',
          8, 'Node.js,Java,TypeScript,Flutter,LLM Apps,Kubernetes,GitHub Actions,PostgreSQL,OAuth2/OIDC,Playwright,Cypress,Postman,Currently I use Firebase Ai to build almost anything on the planet and here are the components are use : AI / LLM Integration – Gemini API usable via Swift,Kotlin,JavaScript,Dart,and Unity
Database – Firestore (NoSQL) and PostgreSQL via Firebase Data Connect
Caching & Messaging – Google Cloud Pub/Sub and Firestore’s internal caching
Search & Indexing – Firebase Search Indexes and Firestore queries
Cloud & DevOps – Google Cloud Platform (GCP) and Firebase Emulator Suite
Authentication – Firebase Auth (OAuth2/OIDC,Google Sign-In,SAML)
Security – Google-managed TLS,IAM,and Firebase Security Rules
Monitoring & Logging – Google Cloud Logging and Monitoring
Testing & Automation – Playwright,and Firebase Test Lab
API Testing – Postman for Firebase REST APIs and Cloud Functions', 'Java,TypeScript', 'Design systems,Accessibility (WCAG)',
          'https://github.com/alkebulan909', 'https://www.linkedin.com/in/calebafrica', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '854328e2-913a-43f0-a68d-7ae252c5a90e', 'fc813c61-3e22-44a2-816b-96a670f33c90',
          'Maniru Malami Umar', 'maniru-malami-umar',
          NULL, 'Nigeria', 'Africa/Lagos',
          '07061802705', 'manirutambuwal@gmail.com',
          9, 'Python,React,React Native,Python (Data),Kubernetes,GitHub Actions,MySQL,Vulnerability Mgmt,Go test,Project management', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/projects', 'https://www.linkedin.com/in/maneertambuwal/', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '07942682-9107-45e8-a073-789b58e1da90', '4d2e8235-05d4-4859-9568-15f1cf29cabd',
          'MUSA SHUAIBU', 'musa-shuaibu',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08064503727', 'musanesta@gmail.com',
          10, 'Node.js,.NET,Python,React,Vue,Flutter,React Native,Kotlin,Python (Data),LLM Apps,Docker,Kubernetes,MySQL,Redis,OAuth2/OIDC,SIEM/SOC,Playwright,Postman,JUnit', 'Python,Kotlin', NULL,
          'https://github.com/musanesta', 'https://www.linkedin.com/me?trk=p_mwlite_feed-secondary_nav', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '53d38b86-3b3d-461f-b4a6-16a931957c8e', 'b0ca4f40-f9ab-4b2b-9325-c8523d24b019',
          'Usman Dahiru Lamido', 'usman-dahiru-lamido',
          'Kano state Nigeria UTC 19:20', 'Nigeria', 'Africa/Lagos',
          '08036427395', 'lamido1419@gmail.com',
          5, 'Java,TypeScript,Flutter,Python (Data),Docker,MySQL,Vulnerability Mgmt,Go test', 'Java,TypeScript,Python', NULL,
          'https://github.com/udlamido', 'https://www.linkedin.com/udlamido1419', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a55f3d47-3c65-47d2-8a85-1ab4bfdf87ae', 'adc6b835-632b-4f71-9db9-0d667aea1ebe',
          'Yusuf Suleiman', 'yusuf-suleiman',
          NULL, 'Nigeria', 'Africa/Lagos',
          '09032225875', 'yusuf.suleiman@localpathways.org',
          7, 'Python,TypeScript,Flutter,Python (Data),Spark,Airflow,Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Go test', 'Python,TypeScript', 'Data pipelines (e.g.,Spark/Airflow),Data warehousing/lakes',
          'https://github.com/eluseful', 'https://www.linkedin.com/in/yusufsuleiman/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '9bf770c7-0709-48e5-830a-389ff22dbcac', '2b28b82c-ceeb-442a-bc43-c747724bfc92',
          'Ebiloma Israel', 'ebiloma-israel-1',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08160240867', 'ebilomaisrael@gmail.com.com',
          5, 'Python,TypeScript,Swift,Python (Data),ML Ops,LLM Apps,GitHub Actions,PostgreSQL,MySQL,SIEM/SOC,Playwright', 'Python,TypeScript,Swift', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/israelebiloma', 'https://linkedin.com/in/israelebiloma', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'dbd8eb04-4ce5-4652-ba43-802e47555803', 'd6ec0661-405a-4ac8-a45e-d7e664cfdd0f',
          'Hafiz Bashir', 'hafiz-bashir',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08103704005', 'abdulhafizbashir@gmail.com',
          1, 'Python,React,Next.js,TypeScript,React Native,Python (Data),Docker,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Postman', 'Python,TypeScript', 'Data pipelines (e.g.,Spark/Airflow),Data warehousing/lakes',
          'https://github.com/Azebash', 'https://www.linkedin.com/in/azebash', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '9e4c75ad-78a2-4ed4-ad45-c281276e7524', 'aa21098e-2c87-4d69-8d10-3133adf990ee',
          'Alhaji Abdullahi Gwani', 'alhaji-abdullahi-gwani',
          'Azare', 'Nigeria', 'Africa/Lagos',
          '07039160499', 'aagwani1@gmail.com',
          10, 'Java,Python,React,React Native,Python (Data),Docker,MySQL,SIEM/SOC,Go test', 'Java,Python', 'Data pipelines (e.g.,Spark/Airflow),Data warehousing/lakes',
          'https://github.com/aagwani', 'https://www.linkedin.com/in/a-a-gwani-212a88228', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    await queryRunner.query(`
      INSERT INTO candidate_profiles (
        id, user_id,
        full_name, slug,
        city, country, timezone,
        phone, contact_email,
        years_of_experience, primary_stacks, languages, experience_areas,
        github_url, linkedin_url, portfolio_url,
        availability_status, preferred_work_mode,
        preferred_hours_start, preferred_hours_end,
        primary_track_id,
        approval_status, visibility_level, profile_strength, created_at, updated_at, version
      ) VALUES
        (
          '98578e46-df60-4329-9899-b25096b1f15e', '086aa916-b5c2-4536-ab00-64e7028fb17a',
          'ABBA MUHAMMAD INUWA', 'abba-muhammad-inuwa',
          'Gombe (GMT+1) Saturday', 'Nigeria', 'Africa/Lagos',
          '08134321720', 'abbaefixxy@gmail.com',
          10, 'Go,.NET,React,Vue,Flutter,React Native,Python (Data),Spark,Docker,Kubernetes,MySQL,Redis,mTLS,SIEM/SOC,Cypress,JUnit', 'Go,Python', 'Data pipelines (e.g.,Spark/Airflow),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/abbaefixxy', 'https://www.linkedin.com/abbaefixxy', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '5c3d60d8-00d6-442b-9f6b-19824907362e', '9e4e5fcf-e5ae-4502-a0cc-6d1d49e76430',
          'Aliyu Shuaib Omeiza', 'aliyu-shuaib-omeiza',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '09034156589', 'aliushuaib7@gmail.com',
          2, 'Go,Python,TypeScript,React Native,Swift,Python (Data),Airflow,Docker,GitHub Actions,PostgreSQL,MySQL,mTLS,Go test', 'Go,Python,TypeScript,Swift', NULL,
          'https://github.com/shuaibaliyu', 'https://www.linkedin.com/in/shuaib-aliyu-4983442b7?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'remote',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '8d66d9a2-d588-44b7-a726-a7a95c797528', '4ed53759-7f79-4b8d-b182-e634c280fe9b',
          'ABDURRAHMAN ABUBAKAR', 'abdurrahman-abubakar',
          'Gombe', 'Nigeria', 'Africa/Lagos',
          '07064454690', 'aadanadda@gmail.com',
          9, 'Node.js,React,React Native,Python (Data),GitHub Actions,MySQL,SIEM/SOC,Go test', 'Python', 'Design systems',
          'https://github.com/AADANADDA', 'https://www.linkedin.com/in/abdurrahman-abubakar-17a05925a?utm_source=share_via&utm_content=profile&utm_medium=member_android', NULL,
          'immediate', 'on_site',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '89b31de5-f3a3-4e2f-b85f-657da2e3ac19', 'e3d7aedf-7db9-4a33-b049-b079c116ed87',
          'Isah Ashafa Ladan', 'isah-ashafa-ladan',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07015826500', 'isaladan88@gmail.com',
          1, 'Python,React,Flutter,Python (Data),ML Ops,Terraform,GitHub Actions,MySQL,Redis,Vulnerability Mgmt,Go test', 'Python', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents)',
          'https://github.com/isaladan/Isa-Ladan', 'https://www.linkedin.com/in/Isaladan', NULL,
          'two_three_months', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '8fe3912e-9fa3-49f1-87fe-dfcfce245c3c', '7bcdf097-6fe8-40e7-85ba-a12b3302b093',
          'Abbasalehpaga', 'abbasalehpaga',
          'Potiskum', 'Nigeria', 'Africa/Lagos',
          '08163762086', 'abbasalehpaga@gmail.com',
          5, 'Java,TypeScript,Flutter,Spark,Docker,MongoDB,Vulnerability Mgmt,Cypress', 'Java,TypeScript', NULL,
          'https://github.com/in/abba-saleh-paga', 'https://www.linkedin.com/in/abba-saleh-paga-016565282', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '228cedf0-cb83-4f02-8c6d-f7a4d9007003', '294cb98d-c644-455a-bfcd-062fff4183ec',
          'AJIBAYO TEMITOPE JOHN', 'ajibayo-temitope-john',
          'Lagos', 'Nigeria', 'Africa/Lagos',
          '08032870249', 'engr.ajibayo@yahoo.com',
          6, 'Node.js,Java,Python,React,Next.js,Vue,React Native,Kotlin,Swift,Python (Data),Docker,Kubernetes,Terraform,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,JUnit,Game Development', 'Java,Python,Kotlin,Swift', NULL,
          'https://github.com/AjibayoTemitopeJohn01;  https://github.com/AjibayoTemitopeJohn', 'https://www.linkedin.com/in/ajibayo-temitope-john-a02a51156/?lipi=urn%3Ali%3Apage%3Ap_mwlite_my_network%3Bgp3AdhMFTuWdkreWjXAQ2Q%3D%3D', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'e4f5f589-92be-4b9e-9fbb-2c237561ca19', '22493d49-aeb4-41f3-8412-9449624ff0fc',
          'Bashir Ismail Musa', 'bashir-ismail-musa',
          'Kano', 'Nigeria', 'Africa/Lagos',
          '08168460824', 'basheerbeemer@gmail.com',
          3, 'Node.js,Python,React,Next.js,Flutter,LLM Apps,GitHub Actions,MySQL,OAuth2/OIDC,Vulnerability Mgmt,Cypress,Go test,Digital strategy & business development,blockchain & web3 ecosystem analysis,community building & ecosystem engagement,research and knowledge translation,tokenomics fundamentals & protocol evaluation', 'Python', 'APIs (REST),Concurrency patterns,Performance tuning',
          'https://github.com/ThaBeemer', 'https://www.linkedin.com/ThaBeemer', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'a6b18873-d962-4731-8217-20433b14d033', 'cb7299e0-3c50-45af-b161-8c7f9481afef',
          'Amiru Bashari', 'amiru-bashari',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '+2347062623235', 'amirubashari@gmail.com',
          1, 'Java,.NET,Python,React,TypeScript,Flutter,React Native,Kotlin,Swift,Python (Data),Airflow,ML Ops,LLM Apps,Docker,Terraform,GitHub Actions,PostgreSQL,MySQL,MongoDB,Redis,Kafka,Elastic,OAuth2/OIDC,mTLS,Vulnerability Mgmt,SIEM/SOC,Playwright,Cypress,Postman,JUnit,Go test', 'Java,Python,TypeScript,Kotlin,Swift', 'Data pipelines (e.g.,Spark/Airflow),MLOps (e.g.,MLflow/KServe),LLM Apps (RAG/Agents),Data warehousing/lakes',
          'https://github.com/Amiruspd/Amiruspd', 'https://www.linkedin.com/me?trk=p_mwlite_profile_self-secondary_nav', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Data Science & Analytics' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '4bc32e82-f59c-43c2-be04-33932286f087', '42c48a26-dec9-4e83-87eb-08fad1273cb1',
          'Abba Bashir', 'abba-bashir',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08137276556', 'abbabashir04@gmail.com',
          1, 'Node.js,Java,Python,Next.js,TypeScript,Flutter,React Native,Python (Data),Airflow,Kubernetes,GitHub Actions,PostgreSQL,MySQL,mTLS,Vulnerability Mgmt,Playwright,Postman', 'Java,Python,TypeScript', NULL,
          'https://github.com/bashirabba768CT', 'https://www.linkedin.com/me?trk=p_mwlite_feed-secondary_nav', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Mobile Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '4c6effb2-effd-40e7-8c34-b210d1f1ff4a', '3a6255a3-774b-49de-8326-352a6b5ec6f9',
          'Job Gabriel Abdul', 'job-gabriel-abdul',
          'Nigeria', 'Nigeria', 'Africa/Lagos',
          '08089839002', 'jobgabrielabdul@gmail.com',
          NULL, 'Go,Node.js,Python,React,Next.js,Flutter,Python (Data),Kubernetes,GitHub Actions,PostgreSQL,MySQL,MongoDB,Vulnerability Mgmt,SIEM/SOC,Postman', 'Go,Python', NULL,
          'https://github.com/Jobcyber', 'https://www.linkedin.com/in/job-gabriel-abdul-3226b63b0?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Cybersecurity' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '8030c73f-5948-4335-a085-ff9b7fb32970', '729f3871-85a2-455b-be0c-ecdc8212e579',
          'Aliyu Abdullahi', 'aliyu-abdullahi',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '07046336373', 'aliyuaa005@gmail.com',
          1, 'Node.js,Python,React,React Native,Python (Data),LLM Apps,GitHub Actions,MongoDB,OAuth2/OIDC,Postman', 'Python', 'Design systems,Component libraries',
          'https://github.com/tafdonjnr/EventApp', 'https://www.linkedin.com/in/aliyu-abdullahi-231b5a1b8/', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          'f8e3f558-e4a0-41b6-98c8-1ea29c582f02', 'b47fcf91-97dc-4ab9-b872-a6be58b579b5',
          'Faith Obaje', 'faith-obaje',
          'Abuja Nigeria', 'Nigeria', 'Africa/Lagos',
          '08163748268', 'faitcyobaje@gmail.com',
          8, 'Go,Node.js,React,Next.js,Flutter,Python (Data),Docker,Kubernetes,PostgreSQL,MySQL,SIEM/SOC,Playwright', 'Go,Python', 'gRPC',
          'https://github.com/faitcyobaje-droid', 'https://www.linkedin.com/in/faith-obaje-99870b3b1?utm_source=share_via&utm_content=profile&utm_medium=member_android', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Backend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '0ff81894-5233-465a-ab6b-4b52ad2b5cad', 'ef86dd6d-31cb-4703-a1c8-1fbf4e218cc5',
          'Hauwa Ibrahim Aminu', 'hauwa-ibrahim-aminu',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '08134673576', 'hauwa.aminu@outlook.com',
          4, 'Java,Python,React,TypeScript,Flutter,Python (Data),Docker,GitHub Actions,PostgreSQL,MySQL,MongoDB,OAuth2/OIDC,Playwright', 'Java,Python,TypeScript', 'Design systems,Component libraries,Accessibility (WCAG)',
          'https://github.com/bunnybanshee', 'https://www.linkedin.com/in/hauwa-ibrahim-aminu-945130153', NULL,
          'one_month', 'hybrid',
          '09:00', '17:00',
          (SELECT id FROM tracks WHERE name = 'Frontend Development' AND is_active = true LIMIT 1),
          'submitted', 'private', 30, NOW(), NOW(), 1
        ),
        (
          '25ee765b-cfd8-4e19-80e6-042aa5bfa796', '61daee29-79ce-4eba-8c9b-45100840aa23',
          'Adnan Shehu', 'adnan-shehu',
          'Abuja', 'Nigeria', 'Africa/Lagos',
          '09038132867', 'adabas04070@gmail.com',
          1, 'Python,React,React Native,Python (Data),GitHub Actions,MySQL,OAuth2/OIDC,Playwright,Excel
Tableau', 'Python', NULL,
          'https://github.com/adnanshehu', 'https://www.linkedin.com/in/adnan-shehu-93074b26b', NULL,
          'immediate', 'hybrid',
          '09:00', '17:00',
          NULL,
          'submitted', 'private', 30, NOW(), NOW(), 1
        )
      ON CONFLICT (slug) DO NOTHING`);

    // ─── CANDIDATE CONSENTS ─────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '444fee23-8e4e-44eb-8c8f-e691af8dd188', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ebd6f5c7-92be-4ea3-9b99-34a278d94e1f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd8793e93-c5d6-462b-800d-42e379a66c88', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0e3b1d43-e018-49a5-9e04-c360fde12602', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'cfb1ea10-9704-47f4-aae9-73bc16141cbc', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ef92f3b2-0997-4801-8b15-21ef92185fcd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b6122c81-d6b5-4079-a17d-84a376210fa2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'db728872-67f5-4ebd-b6bf-768b2e68de9d', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '720597da-446c-4713-9033-bdf3fe1b9161', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd12bc485-e313-472f-89a1-7bc85702be3f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '9b301a27-30df-4816-89a5-b86b985fab1a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c3edbe27-fd03-4fe4-a9f2-32277c0f51f4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '363c776c-3121-42d6-8fa8-e5caf1afd890', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '67f032dd-0584-4d5b-9cef-1619bbda1faa', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f524af35-ebfb-4fdf-9e07-c4b6bd3c3db5', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'aa61dc74-952d-4a37-b97f-2456b6ab408d', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '328420dd-3319-4263-99ac-d627b56e7cd5', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b05a22f5-bc30-4db8-a19f-062467891bfe', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c40fe1d0-521a-493d-bf04-bf2007682457', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '66f67354-8da6-4c02-8bd5-2e8645db3b95', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b0fd0ee1-8e2a-452f-a39b-5ff10dd40701', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd7f15eab-fa38-4cbf-927e-f653e92134cd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '354d56bf-79b9-46ca-a320-e459b282d9cf', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '8ba7adc8-64a7-4d92-8ef8-bf6b513fe90f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '93353ada-db37-4f2a-961b-e14a1f76a36b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5ab63c37-0c60-4202-98e1-7f3eec4528a8', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '28427473-d569-4e00-b843-3fc4c0daf056', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0726c192-24f3-4eed-a232-63bfb1a68719', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c6f30cc1-aef4-4f74-8a47-55256ae169cf', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'fc58c549-f691-4f7e-8679-0f7599510c8a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '8ef5b5a1-2873-49fa-bc70-32802ac3305b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '53ebcac1-0086-44a0-86dc-ade56751e78b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'fc021a58-3fcd-43c2-b264-3f351f722710', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '61d3cd85-9a6f-4f59-850c-89a28c023ec9', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '98160db0-f898-43dc-b53e-17f35b8c776f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '91347618-92ee-4f10-907d-4335f174dd99', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ba7fd68b-f62d-4b5b-b91e-bddd2e79bbb2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '2c20ae1a-20f5-4152-a43a-8f23eedf4082', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '818c730e-6372-4a6c-b8c6-0e05e1e87145', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c5e66d70-22b0-4296-a266-11f6832bc666', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '877025fb-33e0-40a9-9a63-da9c0f88df89', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c9a0715e-bc11-40e5-878a-655a5ad8bbb4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f0d3c93e-ff50-4bf4-aaa9-0e95dfe5f5dd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c445a50a-2fac-4851-b6f2-d3ddb414561e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '383c6134-c366-4ac2-97a2-3dab9f156b4d', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'cad8bf12-bc94-4635-b2f0-49c196a7a41d', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '8d925865-2c66-48c6-b1fd-c16bce81277e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '128a1e97-00ee-474b-9c53-c5d285966d5f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3a293ca8-1161-4792-a8f7-76cfb76bacca', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c428448d-6d28-4cd2-b85e-52a525aa97d6', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '72b0168a-17a7-40ac-b8d2-5ebb1834590c', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a4d8fdba-7b07-4b36-85cb-9c74f9dab380', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a91d813f-8170-4d48-bf67-a39ac6b98cf7', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '07578dda-2331-49ba-a35a-ef914a8adcae', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd3f21d4b-6617-40f8-a1a7-cb3b5c10865b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '54c34623-00d9-4065-8700-3d6a46527fd0', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '38ac74ee-18d4-4efd-870d-ab1a33a8296a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f4977c6b-f761-441a-9a6d-5bb9be02d6c7', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '1209cbe6-c490-4fdb-b6da-cb58c0aeb009', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5d8c540d-1b92-4171-ae6b-c5dd8ee4eb48', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '28235c6b-c8ae-4883-bd21-824a9ba3fe44', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'bf6e9714-1098-4992-bb2f-d87c612fe3bd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '49f24298-d495-463a-9745-dcc68d2170cb', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd46858ff-e9ed-4c38-9ce9-4e1707dd2497', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '00ba7bbc-a3f3-4299-9149-2a3cab6e22ba', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '688c3ab6-f2d4-4895-aa6a-335f8d2be934', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd9b4333d-1c3d-49ea-bbe7-5f27e8cfe5b7', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '2777701b-e3ba-41bb-aa32-c5d6dc2882a4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '6749b1c3-3c04-47e2-a307-3948f24533c3', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '1cca2bcd-d142-4dab-9880-39d7879203b9', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5f5a190d-bfd7-41fb-98ec-9c5c276ef158', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a42fc02f-8bc3-41ad-a54d-7ee28318f60b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a85395a8-739d-4266-8948-4ac028b728bf', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '4eb96e82-5f2d-4ea1-9bad-1fcb2667ee94', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '77d02354-fbbe-4752-a149-644407160d6f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'f956061e-a273-4afe-81bf-ffd67ff1afcd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3313bd0f-2305-4085-8375-b7ef8fd93226', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '69eb7d35-bc24-4645-9c48-5f3e03a6e560', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '4eb2134d-22b8-48fa-8628-4cee4050c073', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ab987f9e-c030-47a0-8262-ee96ded47826', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f7f0764c-c60f-4efa-92d9-fe03b506c175', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '555de691-9426-4eee-bb65-7fafbda6abf2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'effc68b6-6141-4def-bf6f-4cfa675301d8', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0d82d9b4-cd42-473f-8755-1c47fba9d255', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ea102298-ace5-4957-ad9c-8e1f966aba78', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0837d2ce-140d-4280-912b-d829a3e37fb7', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '6f6c2b24-9e7e-4dd3-a1d2-693ea82f2435', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c5bec0f7-d918-463b-a309-641d7c6629de', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0605ac82-d522-4d0f-9cba-a8535f1ed669', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ed6fd69c-a1c2-45ed-9ca7-820b0f31421c', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '0a834aac-9d47-4358-b433-57e7a82633ba', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'e66518e9-46eb-4c24-bacd-cd74b6f700c3', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '377b6a1f-8310-44ee-bfb1-06fdb12e538b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '7e6250a2-8f02-4288-83d5-2475d45879d4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '7f7aca80-c2df-49f9-9ad3-8417690ef955', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd6eaf3c2-32d6-4260-b5a3-d207a6221be4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '71505ad3-be2f-443a-8438-b19bbcd8aa10', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c5500a86-199d-47ec-a261-670b485dfce2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a1ec37e0-dc02-49b8-849a-a63e5e60128c', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b47dc6bf-c283-4b2d-9fcd-41670b14cb56', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '427b9267-b38c-46a1-8097-8428e62aca95', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c2a59b82-d31a-481c-90e3-bd84a4786a50', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'faf4f42b-e80c-4b2f-82de-6605140afcbc', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ac3b6b41-44f1-4cff-8a4e-8510203c2d6e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ff158b86-9935-4180-bef7-d6e7919048e5', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '8df5f1a3-8815-45bb-b604-d1f707916db9', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '96d4bf81-1fa2-46f4-abe9-f2dddcb3b926', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b29b7dba-7030-47a1-b1ab-265341ba8181', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'dc70cdd8-01e9-4332-8b43-bb8ea3b058bf', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'cfecfca4-1a8c-4564-a9f1-000aa7343ecb', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '4cfdd718-f3f3-49e5-ae10-fc70b09dc069', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '27f73d6d-9429-4ebf-aff4-45a33b064c45', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '9e4ae4da-afc2-40b1-880c-e96a97943ac6', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f23501d4-dc0b-4499-88c5-a27c01613b1a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '1410f59d-c715-4cfe-a576-5776b29deef5', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '22e71edf-19d6-4bf8-bb18-5d9c6e0d922a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'e4e89e10-a885-4d69-8850-a72e789a80ac', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '23255b3c-8b00-4a8f-aeec-e64348be45b1', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b6bae22b-222c-4cbc-8423-db3f967fe8f0', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ca9b175a-ba8f-4d95-b4d3-27e601a32ab8', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '7ff39171-3caf-4207-9d2c-b9da6845c8fb', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '66666aee-a99f-4c35-90cc-40fc6dbba792', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'dbc86954-1579-41e5-a470-06aa530b5824', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '14e776e3-db7d-48e2-b88f-bfffecea691c', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'b7e5c5ed-c483-4b35-a3d3-2ac324bae8e4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'fd28e599-ab93-4e85-89e7-059c5066aab2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '1445c39b-cc50-4e7a-94da-7aa03528e29b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '1f939602-4a78-479c-a534-ff58d2198bc1', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'e29a9c7f-a332-482a-aab4-49e26bed8f05', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '627614c7-a353-4b9a-abd0-406d009a3ab2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ab25fb9d-7cdb-4fa9-95ba-343f901ea401', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5e724bc9-7f09-40b6-9b7a-2816c641b8ea', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '841637ac-27c8-49e6-ad8e-8b9482963d74', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a4ebc31e-4e53-4b32-8a6e-b1d8eda10d78', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0effff77-4152-4d15-9a53-f27bad59ee6b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), 'e496e728-19d0-4f61-8218-41267d114d11', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5bfe029a-c82a-4091-9f29-fa7a92eaeebd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5a3000d5-1248-46e9-8d7e-4bc3ba1094dd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3f2e55ff-a79d-4f16-aae6-7f3674f660bd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '1a27159b-ee1f-443c-89ed-2ac87957a8a4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '48fc39f6-daa7-41df-8ed2-1ffb7db55e5f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '512feeac-9d4f-49b4-81f6-f6d8820faea8', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'e5d6230c-0e04-4694-91a4-e42f7f041a74', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'cc9e8bfd-1432-4fae-ab56-0e1c10c49d52', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f52cf530-4d9b-49a5-a189-0156449a4312', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5da0e2fc-a4ac-4ed7-8277-a8d54cdfcab2', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3a0b223b-f339-4f90-9663-e3fe0be98b80', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a801dcdc-db53-4d38-b66e-3ab7fbdf4a9d', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'dc113a28-a511-4ce5-97c1-e29e856969d4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'cc88388a-084b-42c4-b3c1-45963bc829d1', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '838e5df0-0ace-45fd-a011-5eb2f1889d49', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '30b86390-a5b7-4003-a4e3-fcf2bdc60c5a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd6214570-163c-46aa-87e8-fb9c2920942f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '7bdee7ed-3335-4021-8537-eed4ef0df088', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3ba77a0f-c0fb-445b-b433-319a30c3bad0', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5edc8f5b-4178-4ac8-964d-17cc637c9e06', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3e1baf31-ae8e-41d4-b7f8-71def2b5708b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '55411a36-9836-4276-8a76-e55b7f6e3507', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3a86277a-5183-4d39-8c5f-ccc9af84342a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'dcbf6b67-fe59-42c2-92e6-0ad50f1dc295', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f2a2319b-3ac2-4709-ac2d-6a5d9dc5482a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd695d70a-ee60-4fd3-8263-375f90113bdd', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f7604b15-c775-4a1d-beb0-8a72333ad89c', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f8c10a6c-52cf-431a-85ea-117ff5a26a46', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5b85cf44-7beb-42f7-aea8-f3b1576f8b09', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '873927bc-e713-4098-aa04-3dbc7c71df0f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'c4a331ad-9de0-4f1b-bfb3-31713f8dc102', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'd35fe1aa-187a-4990-ab25-cb50cf1cb3f9', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '240082eb-e250-47dc-a800-5de66b548443', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '8e31abb5-5853-48a6-aafa-11780ad1cad4', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '4094f3ea-f588-4de9-904e-32a60aaa2f7f', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'ea1313ad-9747-49af-88b5-5d30d4f8d2ba', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '3d213cf3-1c3a-4971-8a51-dc6f1bfc683b', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '854328e2-913a-43f0-a68d-7ae252c5a90e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '07942682-9107-45e8-a073-789b58e1da90', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '53d38b86-3b3d-461f-b4a6-16a931957c8e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a55f3d47-3c65-47d2-8a85-1ab4bfdf87ae', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '9bf770c7-0709-48e5-830a-389ff22dbcac', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'dbd8eb04-4ce5-4652-ba43-802e47555803', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '9e4c75ad-78a2-4ed4-ad45-c281276e7524', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

    await queryRunner.query(`
      INSERT INTO candidate_consents (id, candidate_id, consent_type, granted, granted_at, ip_address, user_agent, created_at, updated_at, version)
      VALUES
        (gen_random_uuid(), '98578e46-df60-4329-9899-b25096b1f15e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '5c3d60d8-00d6-442b-9f6b-19824907362e', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '8d66d9a2-d588-44b7-a726-a7a95c797528', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '89b31de5-f3a3-4e2f-b85f-657da2e3ac19', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '8fe3912e-9fa3-49f1-87fe-dfcfce245c3c', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '228cedf0-cb83-4f02-8c6d-f7a4d9007003', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'e4f5f589-92be-4b9e-9fbb-2c237561ca19', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'a6b18873-d962-4731-8217-20433b14d033', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '4bc32e82-f59c-43c2-be04-33932286f087', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '4c6effb2-effd-40e7-8c34-b210d1f1ff4a', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '8030c73f-5948-4335-a085-ff9b7fb32970', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), 'f8e3f558-e4a0-41b6-98c8-1ea29c582f02', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '0ff81894-5233-465a-ab6b-4b52ad2b5cad', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1),
        (gen_random_uuid(), '25ee765b-cfd8-4e19-80e6-042aa5bfa796', 'data_processing', true, NOW(), '127.0.0.1', 'XLSX-Seed', NOW(), NOW(), 1)`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete all seeded candidates by external_user_id pattern
    await queryRunner.query(`
      DELETE FROM candidate_consents WHERE candidate_id IN (
        SELECT cp.id FROM candidate_profiles cp
        JOIN talent_users tu ON tu.id = cp.user_id
        WHERE tu.external_user_id LIKE 'seed-candidate-%'
      )
    `);
    await queryRunner.query(`
      DELETE FROM candidate_profiles WHERE user_id IN (
        SELECT id FROM talent_users WHERE external_user_id LIKE 'seed-candidate-%'
      )
    `);
    await queryRunner.query(`
      DELETE FROM talent_user_roles WHERE user_id IN (
        SELECT id FROM talent_users WHERE external_user_id LIKE 'seed-candidate-%'
      )
    `);
    await queryRunner.query(`
      DELETE FROM talent_users WHERE external_user_id LIKE 'seed-candidate-%'
    `);
    // Clean up tracks that were added by this migration (only if no other candidates reference them)
    await queryRunner.query(`
      DELETE FROM tracks WHERE slug IN (
        'frontend-development', 'backend-development', 'full-stack-development',
        'mobile-development', 'data-science-analytics', 'devops-cloud',
        'cybersecurity', 'product-management', 'quality-assurance', 'ui-ux-design'
      ) AND id NOT IN (SELECT DISTINCT primary_track_id FROM candidate_profiles WHERE primary_track_id IS NOT NULL)
    `);
  }
}
