-- Segmento profissional adapta linguagem e modelos. Nao concede plano,
-- permissao ou acesso a dados.
alter table public.companies
  add column if not exists business_segment text not null default 'construction';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_business_segment_chk'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_business_segment_chk
      check (
        business_segment in (
          'architecture',
          'interiors',
          'engineering',
          'construction'
        )
      );
  end if;
end
$$;

comment on column public.companies.business_segment is
  'Adapta vocabulario, onboarding e modelos. Nao altera autorizacao ou plano.';

with template_seed(name, description, position) as (
  values
    (
      'Projeto arquitetônico residencial',
      'Briefing, estudo preliminar, anteprojeto, executivo e entrega',
      10
    ),
    (
      'Projeto de interiores',
      'Briefing, conceito, detalhamento, especificações e entrega',
      11
    ),
    (
      'Acompanhamento técnico',
      'Preparação, visitas, registros, ajustes e encerramento',
      12
    )
),
inserted_templates as (
  insert into public.stage_templates (
    company_id,
    name,
    description,
    is_system,
    position
  )
  select
    null,
    seed.name,
    seed.description,
    true,
    seed.position
  from template_seed seed
  where not exists (
    select 1
    from public.stage_templates existing
    where existing.company_id is null
      and existing.is_system = true
      and existing.name = seed.name
  )
  returning id, name
)
insert into public.stage_template_items (
  template_id,
  position,
  name,
  est_days
)
select
  template.id,
  item.position,
  item.name,
  item.est_days
from inserted_templates template
cross join lateral (
  values
    (
      'Projeto arquitetônico residencial',
      0,
      'Briefing e levantamento',
      3
    ),
    (
      'Projeto arquitetônico residencial',
      1,
      'Estudo preliminar',
      7
    ),
    (
      'Projeto arquitetônico residencial',
      2,
      'Anteprojeto',
      10
    ),
    (
      'Projeto arquitetônico residencial',
      3,
      'Projeto executivo',
      15
    ),
    (
      'Projeto arquitetônico residencial',
      4,
      'Entrega e aceite',
      2
    ),
    (
      'Projeto de interiores',
      0,
      'Briefing e medição',
      2
    ),
    (
      'Projeto de interiores',
      1,
      'Layout e conceito',
      7
    ),
    (
      'Projeto de interiores',
      2,
      'Detalhamento',
      12
    ),
    (
      'Projeto de interiores',
      3,
      'Especificações',
      5
    ),
    (
      'Projeto de interiores',
      4,
      'Apresentação e entrega',
      2
    ),
    (
      'Acompanhamento técnico',
      0,
      'Preparação e análise dos projetos',
      2
    ),
    (
      'Acompanhamento técnico',
      1,
      'Visitas e registros',
      15
    ),
    (
      'Acompanhamento técnico',
      2,
      'Ajustes e orientações',
      7
    ),
    (
      'Acompanhamento técnico',
      3,
      'Vistoria de encerramento',
      1
    ),
    (
      'Acompanhamento técnico',
      4,
      'Relatório final',
      2
    )
) as item(template_name, position, name, est_days)
where template.name = item.template_name;
