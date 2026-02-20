{{- define "eszett-log.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "eszett-log.fullname" -}}
{{ .Release.Name }}-{{ .Chart.Name }}
{{- end -}}

{{- define "eszett-log.labels" -}}
app.kubernetes.io/name: {{ include "eszett-log.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "eszett-log.selectorLabels" -}}
app.kubernetes.io/name: {{ include "eszett-log.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
