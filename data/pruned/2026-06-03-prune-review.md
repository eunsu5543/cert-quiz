# 프루닝 삭제분 검토 (2026-06-03) — 43건

살릴 문제의 **id**를 알려주시면 복원합니다. 카테고리: too-deep(기준보다 깊음)·out-of-scope(범위밖)·wrong-type(유형).

## concept-security (3)

- **concept-013** [too-deep] single
  - Q: NHN Cloud Public API의 종류 중 조직과 프로젝트를 관리하는 API는 무엇인가요?
  - 사유: Public API 종류 중 '프레임워크 API'라는 특정 API 분류명을 암기해야 풀림. 조직/프로젝트 관리를 어느 API가 하는지의 내부 분류 디테일로 입문 깊이 상한 초과.
- **concept-015** [too-deep] single
  - Q: NHN Cloud의 서비스 구성 중 'OpenStack 기반 On-Demand 인프라 서비스로 저렴한 비용으로 인프라 리소스를 필요한 만큼 사용할 수 있는' 서비스 분류는 무엇인가요?
  - 사유: 서비스 분류명(Compute가 'OpenStack 기반 On-Demand'라는 카탈로그 문구)을 암기해 매칭해야 풀림. 분류 명칭·내부 플랫폼(OpenStack) 디테일로 입문 개념 각도를 벗어남.
- **concept-018** [too-deep] multi
  - Q: NHN Cloud 보안 정책에서 설명하는 DRDoS(Distributed Reflect DoS, 분산 반사 서비스 거부 공격)의 특성으로 맞는 것을 모두 고르시오.
  - 사유: DRDoS의 특성(좀비PC 증폭, DNS/NTP/SSDP/Memcached 취약 설정, 대역폭 잠식형)을 모두 골라야 하는 보안 공격 기법 세부 암기. 'DNS/NTP/SSDP/Memcached' 같은 프로토콜 나열은 입문 수준 일반 클라우드 보안 개념을 넘어선 깊은 디테일.

## service-feature (8)

- **feature-007** [too-deep] multi
  - Q: NHN Cloud 로드 밸런서(Load Balancer)가 지원하는 로드 밸런싱 방식에 해당하는 것을 모두 고르세요.
  - 사유: 로드밸런서가 지원하는 알고리즘의 정확한 집합(Round Robin/Least Connections/Source IP 3가지)을 암기해야 풀림. 특정 기능 열거·암기에 다중선택까지 겹쳐 깊이 상한 위반.
- **feature-031** [too-deep] single
  - Q: NHN Cloud NAS 서비스의 스냅숏(snapshot)에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 스냅숏 정의는 얕지만 오답 보기들이 '하루 최대 24회/하루 1회 자동 생성 시점' 등 숫자 한도·자동 생성 스케줄 디테일에 의존. NAS 스냅숏 운영 디테일은 기준의 숫자 한도·깊은 운영 절차에 해당하여 too-deep.
- **feature-050** [too-deep] single
  - Q: NHN Cloud Cloud Functions(클라우드 펑션)의 Pool Manager 모드에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: Cloud Functions의 Pool Manager vs New Deployment 모드 구분과 내부 동작 메커니즘을 외워야 풀림. 특정 제품 깊은 운영 디테일/내부 메커니즘으로 깊은 각도.
- **feature-051** [too-deep] single
  - Q: NHN Cloud Backup(백업) 서비스의 복원(restore)에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: Backup 복원 시 동일 OS 계열 제약, 경로 자동생성 여부 등 깊은 운영 디테일/엣지 케이스를 외워야 풀림. 입문 수준 상한 초과.
- **feature-065** [too-deep] single
  - Q: NHN Cloud NAT 게이트웨이(NAT Gateway)의 소스 IP 변환(SNAT) 동작에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 라우팅 테이블 CIDR 지정→소스 IP의 플로팅 IP 변환이라는 SNAT 내부 동작 메커니즘을 정확히 알아야 풀림. 깊은 운영/내부 메커니즘으로 입문 수준 깊이 상한 초과.
- **feature-066** [too-deep] single
  - Q: NHN Cloud NAT 게이트웨이(NAT Gateway) 하나를 여러 라우팅 테이블에서 사용하는 구성에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 하나의 NAT 게이트웨이 vs 여러 라우팅 테이블, 동일 VPC 내 다대다 지정 등 구성 카디널리티 디테일을 외워야 풀리는 깊은 운영 구성 문제.
- **feature-080** [too-deep] multi
  - Q: NHN Cloud 로드 밸런서(Load Balancer)가 지원하는 프로토콜에 해당하는 것을 모두 고르세요.
  - 사유: 로드 밸런서 지원 프로토콜 목록(TCP/HTTP/HTTPS/TERMINATED_HTTPS)을 정확히 암기해야 FTP/SMTP 제외를 변별할 수 있다. TERMINATED_HTTPS 같은 정확한 프로토콜 명칭 암기는 깊은 디테일로 깊이 상한 초과. 다중선택 남발 경계에도 해당.
- **feature-089** [too-deep] multi
  - Q: NHN Cloud NHN Container Service(NCS)에서 워크로드(workload)를 정의할 때 기술하는 항목에 해당하는 것을 모두 고르세요.
  - 사유: NCS 워크로드 정의 시 기술하는 항목(참조 템플릿, 실행 수, LB 사용 여부 등)을 정확히 열거·암기해야 풀린다. 특정 제품의 구성 항목 암기로 깊은 운영 디테일에 해당, 깊이 상한 초과.

## service-skill (25)

- **skill-001** [too-deep] single
  - Q: NHN Cloud 로드 밸런서를 생성할 때 선택하는 L4 라우팅 모드와 L7 라우팅 모드에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: L4 생성 후 L7 규칙 추가 가능 여부, 라우팅 모드=템플릿이라는 내부 동작/메커니즘 디테일을 외워야 풀린다. L4/L7 개념의 얕은 구분을 넘어선 깊은 운영 디테일.
- **skill-006** [too-deep] multi
  - Q: NHN Cloud Auto Scale의 스케일링 그룹 정책 설정에 대한 설명으로 맞는 것을 모두 고르세요.
  - 사유: Auto Scale 정책의 조건 연산자(and/or) 동작, 재사용 대기 시간, 자동 복구 동작 등 정책 설정의 세부 메커니즘·운영 디테일 암기를 요구. 입문 깊이 상한을 초과.
- **skill-007** [too-deep] multi
  - Q: NHN Cloud 로드 밸런서의 멤버 등록과 상태 확인(health check)에 대한 설명으로 맞는 것을 모두 고르세요.
  - 사유: 로드 밸런서 상태 확인의 멤버 그룹별 동작, 최대 재시도 횟수 후 제외, 기본 멤버 그룹/L7 규칙 대상일 때만 수행 등 깊은 내부 동작·엣지 케이스를 외워야 풀린다.
- **skill-015** [too-deep] single
  - Q: NHN Container Service(NCS)에서 워크로드를 생성할 때 선택하는 배포 컨트롤러인 디플로이먼트와 스테이트풀셋의 차이에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 디플로이먼트/스테이트풀셋의 컨테이너 IP 고정·유동, 병렬·순차 실행 등 컨테이너 오케스트레이션 내부 메커니즘 암기. 기준에서 깊은 쿠버네티스/내부 메커니즘은 범위밖.
- **skill-030** [too-deep] single
  - Q: NHN Cloud Object Storage에서 암호화 컨테이너를 사용해 오브젝트를 보호하는 방식에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 암호화 컨테이너가 Secure Key Manager 대칭 키에 의존하고, 업로드 시점 적용·키 회전 동작까지 알아야 풀린다. 내부 키 관리 메커니즘·운영 디테일로 입문 깊이 상한을 넘음.
- **skill-033** [too-deep] single
  - Q: NHN Cloud Auto Scale 스케일링 그룹에서 '최소 인스턴스', '최대 인스턴스', '구동 인스턴스' 설정이 갖는 의미에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: Auto Scale 최소/최대/구동 인스턴스라는 콘솔 설정 라벨의 정확한 의미를 암기해야 풀린다. 내부 설정 항목 디테일로 깊이 상한 초과.
- **skill-034** [too-deep] single
  - Q: NHN Cloud NAS의 볼륨 복제 기능에서 복제 대상 볼륨의 사용 특성에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: NAS 볼륨 복제에서 '복제 중지 후에야 쓰기 가능'이라는 운영 타이밍과 스냅숏 기반 동작을 외워야 풀린다. 깊은 운영 절차/메커니즘으로 범위밖.
- **skill-035** [too-deep] multi
  - Q: NHN Cloud Object Storage 암호화 컨테이너에 적용되는 정책에 대한 설명으로 맞는 것을 모두 고르세요.
  - 사유: 암호화 컨테이너의 복사 시 재암호화, 키 ID 변경 불가·키 회전, 키 삭제 시 복호화 불가 등 깊은 내부 동작을 암기해야 함. skill-030과도 주제 중복이나 1차 결함은 too-deep.
- **skill-047** [too-deep] single
  - Q: NHN Container Service(NCS)에서 워크로드에 로드 밸런서를 생성하기 위한 조건에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 컨테이너 포트 미지정 템플릿에서 로드 밸런서 생성 가능 여부, 보안 그룹과 컨테이너 포트 추가 관계 등 NCS 로드 밸런서 생성의 세부 제약 조건을 외워야 풀린다. 입문 수준을 넘는 깊은 운영 디테일.
- **skill-048** [too-deep] single
  - Q: NHN Cloud NAS의 암호화 볼륨에서 암호화에 사용되는 대칭 키의 관리 방식에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: NAS 암호화 볼륨의 대칭 키 저장 위치와 사용 중 삭제 불가 제약 등 특정 제품의 깊은 운영 디테일을 암기해야 푸는 문제. 입문 수준 깊이 상한을 넘음.
- **skill-053** [too-deep] single
  - Q: NHN Container Service(NCS) 템플릿에서 컨피그맵(ConfigMap)과 시크릿(Secret)이 적용되는 방식에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: NCS 컨피그맵/시크릿이 템플릿 생성 시점 정보를 고정해 원본 수정이 반영되지 않는다는 불변 특성을 묻는 문제. 쿠버네티스 리소스의 깊은 동작 메커니즘으로 입문 범위 밖.
- **skill-058** [too-deep] single
  - Q: NHN Container Service(NCS) 템플릿에서 프라이빗(private) 컨테이너 레지스트리의 이미지를 사용하도록 구성할 때 필요한 사항으로 맞는 것은 무엇인가요?
  - 사유: NCS 템플릿에서 프라이빗 레지스트리 사용 시 아이디/비밀번호 인증 정보 입력이 필요하다는 구성 디테일을 묻는 문제. 콘솔 입력 항목 수준의 깊은 운영 디테일로 입문 범위 밖.
- **skill-061** [too-deep] single
  - Q: NHN Cloud 로드 밸런서가 프록시 모드(proxy mode)로 동작할 때 멤버 인스턴스 서버가 보게 되는 트래픽의 출발지 IP에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 프록시 모드 동작 시 출발지 IP가 LB IP로 보이고, X-Forwarded-For 헤더(HTTP/TERMINATED_HTTPS) vs 프록시 프로토콜(TCP/HTTPS)로 원본 IP를 확인하는 내부 메커니즘과 프로토콜별 분기를 외워야 풀림. 입문 수준을 넘는 깊은 동작 디테일.
- **skill-063** [too-deep] single
  - Q: NHN Container Service(NCS)에서 워크로드에 설정할 수 있는 '내부 로드 밸런서'의 특성에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: NCS 내부 로드 밸런서가 동일 서브넷만 통신, TCP/UDP만 지원하며 HTTP/HTTPS/TERMINATED_HTTPS 지정 시 TCP로 변경, 포트 지정 시에만 버튼 활성화 등 지원 프로토콜·콘솔 동작의 깊은 운영 디테일을 외워야 풀림.
- **skill-065** [too-deep] multi
  - Q: NHN Cloud 로드 밸런서가 서비스 품질(QoS)과 보호를 위해 제공하는 기능에 대한 설명으로 맞는 것을 모두 고르세요.
  - 사유: 리스너별 연결 수 제한·내부 큐 누적 처리, 유효하지 않은 문자 차단 시 400 응답 전송, 사용자 정의 응답 등 LB의 세부 보호 기능·내부 동작 메커니즘을 암기해야 풀림. 입문 범위 초과.
- **skill-091** [too-deep] single
  - Q: NHN Cloud 콘솔에서 멤버에게 부여한 역할에 조건을 설정할 때, 상위 역할과 하위 역할의 조건 적용 관계에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 상위 역할 조건이 하위 역할에 상속되는 내부 메커니즘을 외워야 풀림 — 깊은 각도.
- **skill-100** [too-deep] single
  - Q: NHN Cloud NAS의 자동 스냅숏 생성 정책에서 최대 저장 개수에 도달했을 때의 동작으로 맞는 것은 무엇인가요?
  - 사유: 자동 스냅숏 최대 개수 도달 시 가장 오래된 것 삭제라는 내부 동작 메커니즘 암기 — 깊은 운영 디테일.
- **skill-101** [too-deep] single
  - Q: NHN Cloud VPC(Virtual Private Cloud)를 삭제할 때의 조건에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: VPC 삭제 시 서브넷·라우팅 테이블·IGW 함께 삭제되는 삭제 캐스케이드/조건 디테일을 외워야 풀림 — 깊은 절차.
- **skill-103** [too-deep] single
  - Q: NHN Cloud NAT 게이트웨이(NAT Gateway)를 생성할 때 지정하는 서브넷이 충족해야 하는 조건으로 맞는 것은 무엇인가요?
  - 사유: NAT 게이트웨이 생성 서브넷이 'IGW 연결된 라우팅 테이블에 연결' 조건을 충족해야 한다는 깊은 전제 조건/메커니즘 암기 — 깊은 각도.
- **skill-105** [too-deep] single
  - Q: NHN Cloud NAS 볼륨의 자동 스냅숏 설정에서 '스냅숏 예약 용량'을 설정하는 목적에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: NAS 스냅숏 '예약 용량'의 내부 동작 메커니즘(예약 공간 할당, 초과 시 데이터 영역 사용 등)을 알아야 풀리는 깊은 운영 디테일. 입문 수준의 서비스 용도 이해를 넘어선다.
- **skill-109** [too-deep] single
  - Q: NHN Cloud 플로팅 IP(Floating IP)에 설정하는 레이블(label)에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 플로팅 IP 레이블이 '선택적 식별 문자열'이라는 세부 입력 항목의 성격을 묻는다. 콘솔 입력 라벨/필드의 깊은 디테일이며, 해설의 '레이블 기준 자동 연동' 등은 입문 수준을 넘어선다.
- **skill-110** [too-deep] single
  - Q: NHN Cloud 보안 그룹(Security Group)을 새로 생성할 때 자동으로 추가되는 규칙에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 보안 그룹 생성 시 자동 추가되는 기본 규칙이 '송신 허용이고 변경·삭제 가능'인지 등 내부 기본동작·편집 가능 여부를 외워야 풀린다. 보안 그룹의 용도가 아닌 기본규칙 메커니즘 암기로 깊은 각도.
- **skill-112** [too-deep] single
  - Q: NHN Cloud 인스턴스 생성 시 지정하는 사용자 스크립트(user script)에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: 사용자 스크립트의 '실행 시점·순서·실행 권한(root/cloud-init)' 디테일을 묻는다. 기준이 예시로 든 바로 그 X 각도('실행 시점·순서 디테일')에 정확히 해당.
- **skill-113** [too-deep] single
  - Q: NHN Container Service(NCS)에서 워크로드를 생성할 때 워크로드 보안 그룹을 별도로 선택하지 않은 경우의 동작에 대한 설명으로 맞는 것은 무엇인가요?
  - 사유: NCS 워크로드 보안 그룹 미선택 시 자동 생성·컨테이너 포트 규칙 자동 생성 등 기본 동작 메커니즘 암기. 입문 수준의 서비스 용도 이해를 넘어선 깊은 운영 디테일.
- **skill-120** [too-deep] single
  - Q: NHN Container Service(NCS)에서 워크로드 템플릿에 NAS 스토리지를 연결하여 컨테이너에서 사용할 때 충족해야 하는 네트워크 조건으로 맞는 것은 무엇인가요?
  - 사유: NCS 워크로드 템플릿에 NAS 연결 시 '동일 VPC 볼륨만 연결 가능'이라는 특정 제품의 깊은 운영 제약/구성 조건을 외워야 풀린다. 컨테이너 서비스의 내부 마운트 네트워크 조건은 입문 수준을 넘는 운영 디테일.

## billing (7)

- **bill-013** [out-of-scope] single
  - Q: NHN Cloud eTax의 개발자 API 제공 목적에 대한 설명으로 가장 적절한 것은 무엇인가요?
  - 사유: eTax 개발자 API의 ERP 연동/대량 발행 자동화 목적은 세금계산서 발행 제품의 깊은 기능 디테일로, billing(요금제·요금정책·크레딧) 범위에서 벗어난 특정 제품 운영 내용.
- **bill-016** [out-of-scope] single
  - Q: NHN Cloud eTax 서비스를 이용하기 위한 회원 가입 전제 조건으로 옳은 것은 무엇인가요?
  - 사유: eTax 이용을 위한 사업자 회원 가입 전제 조건은 세금계산서 발행 제품의 특정 가입 디테일로, 요금제·요금정책·크레딧 중심의 billing 범위에서 벗어남.
- **bill-017** [out-of-scope] single
  - Q: NHN Cloud eTax의 템플릿 관리 기능을 사용하는 목적으로 가장 적절한 것은 무엇인가요?
  - 사유: eTax 템플릿 관리 기능의 용도는 세금계산서 발행 제품의 세부 기능으로, billing(요금) 범위 밖 특정 제품 디테일.
- **bill-018** [wrong-type] multi
  - Q: NHN Cloud eTax 서비스를 정상적으로 이용하기 위해 거쳐야 하는 조건에 대한 설명으로 옳은 것을 모두 고르세요.
  - 사유: 다중선택 유형이며(남발 금지 대상) 내용도 eTax 가입·공인인증서 인증 절차라는 특정 제품 절차 암기로 범위 밖. 유형·범위 모두 부적합. bill-016과도 주제 중복.
- **bill-025** [too-deep] multi
  - Q: NHN Cloud eTax의 사용자 권한(Admin, Member)에 대한 설명으로 옳은 것을 모두 고르세요.
  - 사유: eTax 특정 제품의 Admin/Member 권한별 수행 범위와 '사용자관리' 메뉴명을 외워야 풀림. 특정 상품의 깊은 운영 디테일·메뉴 라벨로 깊이 상한 초과.
- **bill-028** [too-deep] single
  - Q: NHN Cloud eTax의 '사용자관리' 메뉴를 사용하는 목적으로 가장 적절한 것은 무엇인가요?
  - 사유: eTax '사용자관리' 메뉴의 목적을 묻고 오답이 DASH BOARD·환경설정 등 메뉴별 역할 구분을 요구. 특정 제품의 콘솔 메뉴명 암기 의존으로 깊이 상한 초과.
- **bill-033** [too-deep] single
  - Q: NHN Cloud eTax의 대시보드가 사용자에게 제공하는 정보로 가장 적절한 것은 무엇인가요?
  - 사유: eTax 대시보드가 한 화면에서 제공하는 정보(월별 통계·공지·마일리지)를 묻는 특정 제품의 콘솔 화면 디테일. 메뉴/화면별 기능 암기 의존으로 깊이 상한 초과.
