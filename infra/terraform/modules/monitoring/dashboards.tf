resource "aws_cloudwatch_dashboard" "service" {
  dashboard_name = "namma-medmate-${var.environment}"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title   = "Lambda errors"
          region  = "ap-south-1"
          metrics = [["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name]]
        }
      }
    ]
  })
}
