variable "image" {
  description = "Docker image for eszett-log"
  type        = string
  default     = "ghcr.io/OWNER/eszett-log:latest"
}

variable "site_title" {
  description = "Site title displayed in header and footer"
  type        = string
  default     = "eszett-log"
}

variable "default_theme" {
  description = "Default theme for new visitors (light or dark)"
  type        = string
  default     = "light"
}

variable "default_font_size" {
  description = "Default font size for new visitors (small, medium, or large)"
  type        = string
  default     = "medium"
}

variable "datacenters" {
  description = "List of datacenters to deploy to"
  type        = list(string)
  default     = ["dc1"]
}

variable "namespace" {
  description = "Nomad namespace"
  type        = string
  default     = "default"
}

variable "host_volume" {
  description = "Name of the host volume to use for persistent data"
  type        = string
  default     = "eszett-log"
}

job "eszett-log" {
  datacenters = var.datacenters
  namespace   = var.namespace
  type        = "service"

  meta {
    version = "1.0.0"
  }

  group "app" {
    count = 1

    network {
      port "http" {
        static = 3001
        to     = 3001
      }
    }

    # --- Persistent volume (single host_volume, split by subpaths) ---
    volume "storage" {
      type      = "host"
      source    = var.host_volume
      read_only = false
    }

    # --- Service registration & health checks ---
    service {
      name     = "eszett-log"
      provider = "nomad"
      port     = "http"

      tags = [
        "traefik.enable=true",
        "traefik.http.routers.eszett-log.rule=Host(`eszett-log.example.com`)",
      ]

    }

    # --- Application task ---
    task "server" {
      driver = "docker"

      config {
        image      = var.image
        ports      = ["http"]
        entrypoint = ["/bin/sh", "-c"]
        args = [
          "mkdir -p /mnt/eszett-log/posts /mnt/eszett-log/data /mnt/eszett-log/uploads && rm -rf /app/posts /app/data /app/uploads && ln -s /mnt/eszett-log/posts /app/posts && ln -s /mnt/eszett-log/data /app/data && ln -s /mnt/eszett-log/uploads /app/uploads && exec node dist-server/index.js",
        ]
        auth_config_file = "${NOMAD_SECRETS_DIR}/docker.json"
      }

      volume_mount {
        volume      = "storage"
        destination = "/mnt/eszett-log"
        read_only   = false
      }

      # Docker registry auth (generated from Nomad Variables)
      template {
        data        = <<-EOT
        {{- with nomadVar "nomad/jobs/eszett-log" }}
        {"auths":{"ghcr.io":{"username":"{{ .ghcr_username }}","password":"{{ .ghcr_token }}"}}}
        {{- end }}
        EOT
        destination = "${NOMAD_SECRETS_DIR}/docker.json"
      }

      # Secrets from Nomad Variables (nomad var put)
      template {
        data        = <<-EOT
          {{ with nomadVar "nomad/jobs/eszett-log" }}
          JWT_SECRET={{ .jwt_secret }}
          {{ end }}
        EOT
        destination = "${NOMAD_SECRETS_DIR}/env"
        env         = true
      }

      env {
        NODE_ENV          = "production"
        PORT              = "${NOMAD_PORT_http}"
        SITE_TITLE        = var.site_title
        DEFAULT_THEME     = var.default_theme
        DEFAULT_FONT_SIZE = var.default_font_size
      }

      resources {
        cpu    = 500
        memory = 256
      }

      restart {
        attempts = 3
        interval = "5m"
        delay    = "15s"
        mode     = "delay"
      }
    }
  }
}
