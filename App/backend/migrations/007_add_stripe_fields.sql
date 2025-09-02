-- Adicionar campos do Stripe na tabela de planos
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255) NULL;

-- Atualizar plano básico com IDs do Stripe
UPDATE subscription_plans
SET 
  stripe_price_id = 'price_basic',
  stripe_product_id = 'prod_basic'
WHERE id = 'basic';

-- Criar índices para os campos do Stripe
CREATE INDEX IF NOT EXISTS idx_stripe_price_id ON subscription_plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_product_id ON subscription_plans(stripe_product_id); 