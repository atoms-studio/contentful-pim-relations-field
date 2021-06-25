import React from "react";
import RelationsRepeaterField from "./RelationsRepeaterField";
import { render } from "@testing-library/react";
import { mockSdk } from "../../test/mocks/mockSdk";

describe("RelationsRepeaterField component", () => {
  it("Component text exists", () => {
    const { getByText } = render(<RelationsRepeaterField sdk={mockSdk} />);

    expect(getByText("Add")).toBeInTheDocument();
  });
});
