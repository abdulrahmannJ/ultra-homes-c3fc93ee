CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'abdulrahmann0912@gmail.com';

  IF uid IS NULL THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'abdulrahmann0912@gmail.com', extensions.crypt('12345678', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Abdulrahman"}'::jsonb, now(), now()
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'abdulrahmann0912@gmail.com', 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (uid, 'abdulrahmann0912@gmail.com', 'Abdulrahman')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.staff_members (user_id, full_name, email, title, is_active, permissions)
  VALUES (uid, 'Abdulrahman', 'abdulrahmann0912@gmail.com', 'Super Admin', true,
    ARRAY['analytics','leads','properties','content','agents','blog','staff','rentals'])
  ON CONFLICT (user_id) DO UPDATE
    SET is_active = true,
        title = 'Super Admin',
        permissions = ARRAY['analytics','leads','properties','content','agents','blog','staff','rentals'];
END $$;