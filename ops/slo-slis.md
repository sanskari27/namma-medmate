# SLOs and SLIs

Written before alarms were wired.

| Service        | SLI                                  | SLO                        |
| -------------- | ------------------------------------ | -------------------------- |
| Auth API       | Successful non-5xx responses / total | 99.9% monthly availability |
| Auth API       | 5xx responses / total                | < 1%                       |
| Auth API       | p95 latency                          | < 500 ms                   |
| Dispensary web | Successful CloudFront responses      | 99.9% availability         |
| Dispensary web | p75 LCP                              | < 2.5 s                    |
