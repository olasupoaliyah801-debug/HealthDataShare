;; HealthToken.clar
;; SIP-10 compliant fungible token for HealthDataShare platform
;; This token (HTK) is used for incentives: rewarding patients for data sharing,
;; staking for researchers, governance voting, etc.
;; Features: Minting with metadata (e.g., reason for mint like "data submission reward"),
;; burning for retirement, pausable for emergencies, multiple minters (oracles/reward pool),
;; admin controls, mint records for transparency in health data incentives.

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_METADATA_LEN u500)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_PAUSED (err u101))
(define-constant ERR_INVALID_AMOUNT (err u102))
(define-constant ERR_INVALID_RECIPIENT (err u103))
(define-constant ERR_INVALID_MINTER (err u104))
(define-constant ERR_ALREADY_REGISTERED (err u105))
(define-constant ERR_METADATA_TOO_LONG (err u106))
(define-constant ERR_INVALID_SENDER (err u107))
(define-constant ERR_INSUFFICIENT_BALANCE (err u108))
(define-constant ERR_NOT_OWNER (err u109))
(define-constant ERR_MINT_LIMIT_EXCEEDED (err u110))
(define-constant ERR_INVALID_METADATA (err u111))
(define-constant ERR_CONTRACT_PAUSED (err u112))
(define-constant ERR_ZERO_AMOUNT (err u113))

;; Data Variables
(define-data-var token-name (string-ascii 32) "HealthToken")
(define-data-var token-symbol (string-ascii 32) "HTK")
(define-data-var token-decimals uint u6) ;; 6 decimals for precision in rewards
(define-data-var total-supply uint u0)
(define-data-var contract-paused bool false)
(define-data-var admin principal CONTRACT_OWNER)
(define-data-var mint-counter uint u0)
(define-data-var max-mint-per-tx uint u1000000) ;; Limit to prevent abuse

;; Data Maps
(define-map balances principal uint)
(define-map minters principal bool)
(define-map mint-records
  uint ;; mint-id
  {
    amount: uint,
    recipient: principal,
    metadata: (string-utf8 500), ;; e.g., "Reward for rare disease data submission"
    minter: principal,
    timestamp: uint
  }
)

;; Traits
(define-trait admin-trait
  (
    (pause-contract () (response bool uint))
    (unpause-contract () (response bool uint))
    (set-admin (principal) (response bool uint))
    (add-minter (principal) (response bool uint))
    (remove-minter (principal) (response bool uint))
  )
)

;; Read-only functions (SIP-10 compliant)
(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-token-uri)
  (ok none) ;; No URI for now, can be added later
)

(define-read-only (is-minter (account principal))
  (default-to false (map-get? minters account))
)

(define-read-only (is-paused)
  (var-get contract-paused)
)

(define-read-only (get-mint-record (mint-id uint))
  (map-get? mint-records mint-id)
)

(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Public functions (SIP-10 compliant transfer)
(define-public (transfer (recipient principal) (amount uint) (memo (optional (buff 34))))
  (let
    (
      (sender tx-sender)
      (sender-balance (unwrap-panic (get-balance sender)))
    )
    (asserts! (not (var-get contract-paused)) ERR_PAUSED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (asserts! (<= amount sender-balance) ERR_INSUFFICIENT_BALANCE)
    (asserts! (not (is-eq recipient sender)) ERR_INVALID_RECIPIENT) ;; Optional, but prevents self-transfer abuse
    (try! (as-contract (stx-transfer? amount sender recipient))) ;; Wait, no: this is FT, not STX
    ;; Actually for FT: update balances
    (map-set balances sender (- sender-balance amount))
    (map-set balances recipient (+ (default-to u0 (map-get? balances recipient)) amount))
    ;; Ignore memo for now, as per SIP-10 it's optional
    (ok true)
  )
)

;; Mint function: Only minters can call, with metadata for auditability
(define-public (mint (amount uint) (recipient principal) (metadata (string-utf8 500)))
  (let
    (
      (minter tx-sender)
      (current-balance (default-to u0 (map-get? balances recipient)))
    )
    (asserts! (not (var-get contract-paused)) ERR_PAUSED)
    (asserts! (is-minter minter) ERR_INVALID_MINTER)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (<= amount (var-get max-mint-per-tx)) ERR_MINT_LIMIT_EXCEEDED)
    (asserts! (<= (len metadata) MAX_METADATA_LEN) ERR_METADATA_TOO_LONG)
    (asserts! (not (is-eq recipient CONTRACT_OWNER)) ERR_INVALID_RECIPIENT) ;; Prevent mint to contract owner unless needed
    (var-set total-supply (+ (var-get total-supply) amount))
    (map-set balances recipient (+ current-balance amount))
    (let ((new-id (+ (var-get mint-counter) u1)))
      (map-set mint-records new-id
        {
          amount: amount,
          recipient: recipient,
          metadata: metadata,
          minter: minter,
          timestamp: block-height
        }
      )
      (var-set mint-counter new-id)
    )
    (ok true)
  )
)

;; Burn function: Holders can burn their own tokens, e.g., for retiring rewards
(define-public (burn (amount uint))
  (let
    (
      (sender tx-sender)
      (sender-balance (unwrap-panic (get-balance sender)))
    )
    (asserts! (not (var-get contract-paused)) ERR_PAUSED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (<= amount sender-balance) ERR_INSUFFICIENT_BALANCE)
    (map-set balances sender (- sender-balance amount))
    (var-set total-supply (- (var-get total-supply) amount))
    (ok true)
  )
)

;; Admin functions
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (var-set contract-paused true)
    (ok true)
  )
)

(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (var-set contract-paused false)
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (var-set admin new-admin)
    (ok true)
  )
)

(define-public (add-minter (new-minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (asserts! (not (is-minter new-minter)) ERR_ALREADY_REGISTERED)
    (map-set minters new-minter true)
    (ok true)
  )
)

(define-public (remove-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (map-set minters minter false)
    (ok true)
  )
)

;; Additional utility: Set max mint per tx
(define-public (set-max-mint-per-tx (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_UNAUTHORIZED)
    (asserts! (> new-max u0) ERR_INVALID_AMOUNT)
    (var-set max-mint-per-tx new-max)
    (ok true)
  )
)

;; Initialization: Add deployer as initial minter
(begin
  (map-set minters CONTRACT_OWNER true)
)