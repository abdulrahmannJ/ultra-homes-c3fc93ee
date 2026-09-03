CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  admin_email text := 'abdulrahmann0912@gmail.com';
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      admin_email,
      extensions.crypt('12345678', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Abdulrahman"}'::jsonb,
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_id,
      admin_id::text,
      'email',
      jsonb_build_object('sub', admin_id::text, 'email', admin_email, 'email_verified', true, 'phone_verified', false),
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (admin_id, admin_email, 'Abdulrahman')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.staff_members (user_id, full_name, email, title, is_active, permissions)
  VALUES (
    admin_id,
    'Abdulrahman',
    admin_email,
    'Super Admin',
    true,
    ARRAY['analytics','leads','properties','content','agents','blog','staff']
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    title = EXCLUDED.title,
    is_active = true,
    permissions = EXCLUDED.permissions;
END
$$;