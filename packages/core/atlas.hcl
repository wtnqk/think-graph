env "local" {
  src = "file://db/schema.sql"
  url = "sqlite://db/local.db"
  dev = "sqlite://file?mode=memory"
  migration {
    dir = "file://db/migrations"
  }
}

env "d1" {
  src = "file://db/schema.sql"
  dev = "sqlite://file?mode=memory"
  migration {
    dir = "file://db/migrations"
  }
}
