resource "aws_sns_topic" "alarms" {
  name = "namma-medmate-${var.environment}-alarms"
}

output "alarm_topic_arn" { value = aws_sns_topic.alarms.arn }
