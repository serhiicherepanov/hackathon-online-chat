import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

describe("<AccordionTrigger />", () => {
  it("uses a right chevron while collapsed and rotates on open", () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="section">
          <AccordionTrigger>Section</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Section" });
    const icon = screen.getByTestId("accordion-chevron");

    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(icon).toHaveAttribute("data-direction", "right");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "open");
  });

  it("orders title first, actions second, and the chevron last", () => {
    const onAction = vi.fn();

    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="section">
          <AccordionTrigger actions={<button onClick={onAction}>Action</button>}>
            Section
          </AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const title = screen.getByTestId("accordion-title");
    const actions = screen.getByTestId("accordion-actions");
    const chevron = screen.getByTestId("accordion-chevron");

    expect(
      title.compareDocumentPosition(actions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      actions.compareDocumentPosition(chevron) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("invokes compact header actions without toggling the section", () => {
    const onAction = vi.fn();

    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="section">
          <AccordionTrigger actions={<button onClick={onAction}>Action</button>}>
            Section
          </AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Section" });
    const action = screen.getByRole("button", { name: "Action" });

    fireEvent.click(action);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute("data-state", "closed");
  });

  it("can open an external action flow while the section stays collapsed", () => {
    function Example() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <Accordion type="single" collapsible defaultValue="section">
            <AccordionItem value="section">
              <AccordionTrigger
                actions={
                  <button type="button" onClick={() => setOpen(true)}>
                    New DM
                  </button>
                }
              >
                Section
              </AccordionTrigger>
              <AccordionContent>Body</AccordionContent>
            </AccordionItem>
          </Accordion>
          {open ? <div role="dialog" aria-label="Start a DM" /> : null}
        </>
      );
    }

    render(<Example />);

    const trigger = screen.getByRole("button", { name: "Section" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "closed");

    fireEvent.click(screen.getByRole("button", { name: "New DM" }));

    expect(screen.getByRole("dialog", { name: "Start a DM" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("data-state", "closed");
  });
});
