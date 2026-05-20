---
name: nextjs-folder-structure
description: Next.js App Router의 src/ 폴더 구조·배치·의존성 규칙을 정의한다. 새 페이지·컴포넌트 추가, 리팩터링, 코드 리뷰, 폴더 구조 정리 요청 시 사용한다.
---

# Next.js Folder Structure

Next.js App Router 프로젝트의 `src/` 레이아웃과 폴더 규칙. 새 페이지·컴포넌트 추가, 리팩터링, 코드 리뷰 시 이 규칙을 따른다.

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router (라우팅 진입점만)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (group)/                  # Route group (선택)
│   ├── dashboard/
│   ├── settings/
│   └── api/                      # API Routes
│       └── [resource]/
│           └── route.ts
│
├── views/                        # 페이지별 View (app/page.tsx가 import)
│   ├── dashboard/
│   │   ├── DashboardPageView.tsx
│   │   ├── index.ts
│   │   └── components/
│   │       ├── StatsCard.tsx
│   │       └── index.ts
│   ├── settings/
│   └── ...
│
├── components/                   # 전역 공유 컴포넌트 (2개 이상 화면에서 재사용)
│   ├── AppShell/
│   │   ├── AppShell.tsx
│   │   ├── index.ts
│   │   └── components/
│   │       ├── Header.tsx
│   │       └── index.ts
│   ├── ui/                       # 디자인 시스템 (Button, Input, Select 등)
│   └── ...
│
├── hooks/                        # 커스텀 React 훅 (데이터 fetch, UI 로직)
│   ├── useProducts.ts
│   └── useAuth.ts
│
├── service/                      # (선택) DB·외부 API·데이터 접근
│   ├── db.ts
│   ├── product-store.ts
│   └── schema.sql
│
├── lib/                          # 순수 유틸리티 (프로젝트 레이어 import 금지)
│   ├── utils.ts                  #   Tailwind cn() 등
│   ├── date-utils.ts
│   ├── error-utils.ts
│   ├── query-client.ts           #   TanStack Query 설정
│   └── query-keys.ts             #   쿼리 키 팩토리
│
├── store/                        # (선택) Zustand 등 클라이언트 상태
│   └── uiStore.ts
│
├── providers/                    # React Context Providers
│   ├── QueryProvider.tsx
│   └── ThemeProvider.tsx
│
├── constants/                    # 상수 정의
│   └── theme.ts
│
└── types/                        # 공유 타입 정의
    ├── index.ts
    └── product.ts
```

### 선택 레이어

프로젝트 규모에 따라 아래 폴더를 추가한다. **없어도 되는 레이어는 만들지 않는다.**

| 폴더 | 용도 |
|------|------|
| `service/` | DB, REST/GraphQL 클라이언트, 파일 I/O |
| `actions/` | Server Actions (`"use server"`) |
| `store/` | 클라이언트 전역 UI 상태 |
| `domain/` | 비즈니스 규칙·도메인 로직 (service와 분리할 때) |

## 폴더 규칙 (필수)

### 1) `app/`는 라우팅 진입점만 담당

- `app/**/page.tsx`는 View를 import해서 그대로 렌더만 한다.
- 페이지 로직/상태/화면 구성은 `views/**`에 둔다.
- `layout.tsx`, `loading.tsx`, `error.tsx` 등 App Router 파일만 `app/`에 둔다.

```tsx
import DashboardPageView from "@/views/dashboard";

export default function DashboardPage() {
  return <DashboardPageView />;
}
```

### 2) `views/` 구조 규칙

- 각 페이지 폴더는 `XxxPageView.tsx` + `index.ts`를 기본으로 한다.
- `index.tsx`는 사용하지 않는다.
- 엔트리 export는 `index.ts`만 사용한다.

```ts
export { default } from "./DashboardPageView";
```

- 페이지 전용 하위 조각 컴포넌트는 같은 폴더의 `components/`로 분리한다.
- `components/index.ts`를 만들어 배럴 export로만 소비한다.

### 3) `components/`는 전역 공유만 허용

- `src/components`에는 **2개 이상 화면에서 재사용되는 컴포넌트만** 둔다.
- 한 페이지에서만 쓰이면 `views/<page>/components`로 이동한다.
- 전역 컴포넌트도 폴더 단위로 관리한다.
  - `components/Foo/Foo.tsx`
  - `components/Foo/index.ts`
- 컴포넌트 폴더명은 **반드시 PascalCase**를 사용한다.
  - `components/sidebar` (X)
  - `components/Sidebar` (O)
- 대표 컴포넌트가 있는 폴더는 **폴더명과 대표 컴포넌트명이 반드시 동일**해야 한다.
  - `components/Sidebar/Sidebar.tsx`에서 `export default Sidebar` (O)
  - `components/Sidebar/Sidebar.tsx`에서 `export default AppSidebar` (X)

### 4) 모든 엔트리 파일은 `index.ts`

- `index.tsx` 금지 (`views`, `components` 모두 동일).
- `index.ts`는 export만 담당하고 UI 로직을 넣지 않는다.

### 5) 하위 컴포넌트 폴더 규칙

- 메인 컴포넌트 옆에 보조 컴포넌트가 2개 이상이면 `components/`로 분리한다.
- 보조 컴포넌트도 직접 파일 경로 import 대신 `./components`를 우선 사용한다.

### 6) 타입 분리 규칙 (`types/`)

- 컴포넌트/뷰 파일 내부 타입 선언(`interface`, `type`)은 `types/`로 분리한다.
- 도메인별 타입 파일은 `types/<domain>.ts`, 공통 re-export는 `types/index.ts`를 사용한다.
- 컴포넌트 파일에서는 `import type`으로만 타입을 가져온다.
- 배럴 파일에서도 타입을 re-export해서 import 경로를 일관되게 유지한다.

### 7) Import 경로 기준

- 페이지 레벨: `@/views/<route>`
- 전역 공유: `@/components/<ComponentFolder>` (`ComponentFolder`는 PascalCase)
- 같은 페이지 전용 조각: `./components`
- 훅: `@/hooks/<hookName>`
- 유틸: `@/lib/<file>`

### 8) 컴포넌트 작성 규칙 (강제)

- **1파일 1컴포넌트**를 원칙으로 한다. 한 파일에 여러 컴포넌트를 함께 선언하지 않는다.
- 컴포넌트 export는 **무조건 `export default`**를 사용한다.
- 컴포넌트 선언은 `function` 선언식 대신 **함수형 컴포넌트 상수**를 사용한다.

```tsx
const ProductCard = ({ name }: ProductCardProps) => {
  return <div>{name}</div>;
};

export default ProductCard;
```

### 9) 엔트리 컴포넌트 역할 분리 규칙 (강제)

- 각 컴포넌트 폴더의 대표 파일(예: `Sidebar/Sidebar.tsx`, `AppShell/AppShell.tsx`)은 **엔트리 조합 역할만** 담당한다.
- 엔트리 파일에는 페이지/섹션 구조를 한눈에 보여주는 수준의 코드만 남기고, 상세 UI/상태/이벤트 로직은 `components/` 하위로 분리한다.
- 상세 컴포넌트는 상대적으로 무거워져도 허용한다. 복잡도는 엔트리가 아니라 하위 컴포넌트로 이동시킨다.
- 엔트리 파일에서 직접 긴 JSX 블록, 다수의 `useState/useEffect/useMemo/useCallback` 로직이 필요해지면 분리 대상으로 간주한다.

### 10) 상태 소스 단일화 규칙 (강제)

- 훅/스토어(`useXxx`, Zustand store 등)에서 **직접 조회 가능한 값은 props로 다시 전달하지 않는다.**
- 같은 데이터를 상위에서 props로 내려주고 하위에서 다시 훅/스토어로 읽는 **이중 소스 패턴을 금지**한다.
- 데이터 소스는 컴포넌트 경계마다 하나만 선택한다.
  - 상위 소유가 필요하면 props만 사용
  - 전역/공유 상태면 하위에서 훅/스토어 직접 사용
- 예외는 테스트/스토리북 등 명확한 목적이 있을 때만 허용하며, 주석으로 의도를 명시한다.

## 의존성 방향

```
constants/, types/
       ↓
     lib/  (순수 유틸 — 다른 src/ 레이어 import 금지)
       ↓
  service/  (선택 — DB, 외부 API)
       ↓
  hooks/, actions/  (데이터 접근·변경)
       ↓
views/, components/  (UI — service 직접 import 금지, hooks/actions 경유)
```

- `lib/`은 `app/`, `views/`, `components/`, `service/` 등 프로젝트 레이어를 import하지 않는다.
- `views/`, `components/`는 `service/`를 직접 import하지 않고 `hooks/` 또는 Server Actions를 경유한다.
- **역방향 의존 금지**: `lib/` → `service/`, `components/` → `service/` 직접 호출 등.

## API Routes 규칙

`app/api/` 아래는 RESTful 리소스 단위로 구성한다.

```
app/api/
├── products/
│   ├── route.ts              # GET (목록), POST (생성)
│   └── [id]/
│       └── route.ts          # GET, PUT/PATCH, DELETE
└── auth/
    └── [...nextauth]/
        └── route.ts
```

- Route Handler(`route.ts`)에는 HTTP 처리만 둔다. 비즈니스 로직은 `service/` 또는 `actions/`로 위임한다.
- 요청 검증, 에러 응답 형식은 프로젝트 전체에서 일관되게 유지한다.

## 새 페이지 추가 체크리스트

```
- [ ] app/<route>/page.tsx — View import만
- [ ] views/<route>/XxxPageView.tsx + index.ts
- [ ] 페이지 전용 컴포넌트 → views/<route>/components/
- [ ] 2개 이상 페이지에서 쓰이면 → components/로 승격
- [ ] 타입 → types/
- [ ] 데이터 fetch → hooks/ (또는 Server Component + service/)
```
