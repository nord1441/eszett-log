variable "image" {
  description = "Docker image for eszett-log"
  type        = string
  default     = "ghcr.io/OWNER/eszett-log:latest"
}

variable "jwt_secret" {
  description = "Secret key used for JWT token signing"
  type        = string
  default     = "change-me-in-production"
  sensitive   = true
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

variable "default_font_family" {
  description = "Default font family for new visitors (doto or bebas-neue)"
  type        = string
  default     = "doto"
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

variable "host_data_dir" {
  description = "Base directory on the host for persistent data"
  type        = string
  default     = "/opt/eszett-log"
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

    # --- Persistent volumes (host_volume) ---
    volume "posts" {
      type      = "host"
      source    = "eszett-log-posts"
      read_only = false
    }

    volume "data" {
      type      = "host"
      source    = "eszett-log-data"
      read_only = false
    }

    volume "uploads" {
      type      = "host"
      source    = "eszett-log-uploads"
      read_only = false
    }

    # --- Service registration & health checks ---
    service {
      name = "eszett-log"
      port = "http"

      tags = [
        "traefik.enable=true",
        "traefik.http.routers.eszett-log.rule=Host(`eszett-log.example.com`)",
      ]

      check {
        name     = "http-health"
        type     = "http"
        path     = "/api/settings"
        interval = "10s"
        timeout  = "3s"
      }
    }

    # --- Application task ---
    task "server" {
      driver = "docker"

      config {
        image = var.image
        ports = ["http"]
      }

      volume_mount {
        volume      = "posts"
        destination = "/app/posts"
        read_only   = false
      }

      volume_mount {
        volume      = "data"
        destination = "/app/data"
        read_only   = false
      }

      volume_mount {
        volume      = "uploads"
        destination = "/app/uploads"
        read_only   = false
      }

      env {
        NODE_ENV             = "production"
        PORT                 = "${NOMAD_PORT_http}"
        JWT_SECRET           = var.jwt_secret
        SITE_TITLE           = var.site_title
        DEFAULT_THEME        = var.default_theme
        DEFAULT_FONT_SIZE    = var.default_font_size
        DEFAULT_FONT_FAMILY  = var.default_font_family
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
