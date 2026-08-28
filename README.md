# lolo-crud

Lolo CRUD library function.

## List query: `consistent`

`GET /resources?consistent=true` skips enriched/eventual list paths (RisingWave overlays, secondary reads) and reads from Mongo on the primary. Auth and tenancy hooks still apply.

Use after create/update in batch provisioning, or when you need read-your-writes without waiting for projection catch-up.

Referential integrity checks (`refCheck`) always use consistent list internally.
