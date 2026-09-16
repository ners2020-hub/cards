import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('outputs', { recursive: true });
const users=Array.from({length:3},()=>({id:randomUUID(),email:`fatebound-test-${randomUUID()}@example.invalid`,password:randomUUID()+randomUUID()}));
await writeFile('outputs/live-test-private.json',JSON.stringify(users));
const sql=users.map(u=>`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values('00000000-0000-0000-0000-000000000000','${u.id}','authenticated','authenticated','${u.email}',extensions.crypt('${u.password}',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');`).join('\n');
await writeFile('outputs/live-test-setup.sql',`begin;\n${sql}\ncommit;`);
await writeFile('outputs/live-test-cleanup.sql',`begin;\ndelete from public.mp_reports where actor_id in (${users.map(u=>`'${u.id}'`).join(',')});\ndelete from public.mp_matches where host_id in (${users.map(u=>`'${u.id}'`).join(',')});\ndelete from auth.users where id in (${users.map(u=>`'${u.id}'`).join(',')});\ncommit;`);
console.log('Prepared three temporary test identities.');
