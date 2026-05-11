-- Migration: 20260528_folio_sequences.sql
-- Description: Global per doc_type+year folio sequences + fn_next_folio RPC.
--
-- Folios use PREFIX-YEAR-##### (e.g. COT-2026-00001). quotes/purchase_orders/payments
-- still enforce UNIQUE(folio) globally, so the counter is global per (doc_type, year),
-- not per org. Multi-tenant safety: fn_next_folio verifies caller membership in p_org_id.

CREATE TABLE IF NOT EXISTS public.document_sequences (
    doc_type   TEXT NOT NULL,
    year       INT  NOT NULL,
    last_value INT  NOT NULL DEFAULT 0,
    prefix     TEXT NOT NULL,
    PRIMARY KEY (doc_type, year)
);

-- Block direct client access; only SECURITY DEFINER function touches this table.
REVOKE ALL ON public.document_sequences FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.fn_next_folio(
    p_org_id UUID,
    p_doc_type TEXT,
    p_year INT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year   INT := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
    v_seq    INT;
    v_prefix TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'fn_next_folio: authentication required' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE user_id = auth.uid() AND org_id = p_org_id
    ) THEN
        RAISE EXCEPTION 'fn_next_folio: not a member of this organization' USING ERRCODE = '42501';
    END IF;

    IF p_doc_type NOT IN ('QUOTE', 'PO', 'PAYMENT', 'INVOICE') THEN
        RAISE EXCEPTION 'fn_next_folio: invalid doc_type %', p_doc_type USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.document_sequences (doc_type, year, last_value, prefix)
        VALUES (
            p_doc_type,
            v_year,
            1,
            CASE p_doc_type
                WHEN 'QUOTE' THEN 'COT'
                WHEN 'PO' THEN 'OC'
                WHEN 'PAYMENT' THEN 'PAG'
                WHEN 'INVOICE' THEN 'FAC'
                ELSE 'DOC'
            END
        )
        ON CONFLICT (doc_type, year)
            DO UPDATE SET last_value = public.document_sequences.last_value + 1
        RETURNING last_value, prefix INTO v_seq, v_prefix;

    RETURN format('%s-%s-%s', v_prefix, v_year, LPAD(v_seq::TEXT, 5, '0'));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_next_folio(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_next_folio(UUID, TEXT, INT) TO authenticated;

COMMENT ON FUNCTION public.fn_next_folio(UUID, TEXT, INT) IS
    'Returns next canonical folio (PREFIX-YEAR-#####). Caller must be org member; sequence is global per doc_type+year for UNIQUE(folio) compatibility.';
