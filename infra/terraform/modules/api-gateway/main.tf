variable "environment" { type = string }
variable "api_name" { type = string }
variable "lambda_invoke_arn" { type = string }
variable "lambda_function_name" { type = string }
variable "custom_domain_name" { type = string }
variable "base_path" { type = string }

resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_apigatewayv2_api_mapping" "this" {
  api_id          = aws_apigatewayv2_api.this.id
  domain_name     = var.custom_domain_name
  stage           = aws_apigatewayv2_stage.default.id
  api_mapping_key = var.base_path
}

output "api_endpoint" { value = aws_apigatewayv2_api.this.api_endpoint }
output "api_id" { value = aws_apigatewayv2_api.this.id }
output "stage_id" { value = aws_apigatewayv2_stage.default.id }
