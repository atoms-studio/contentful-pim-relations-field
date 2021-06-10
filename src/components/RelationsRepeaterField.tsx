// @ts-nocheck
import { React, useState, useEffect, useLayoutEffect, Fragment } from "react";
import {
  Button,
  EditorToolbarButton,
  SkeletonBodyText,
  SkeletonContainer,
  TextField,
  Paragraph,
  Card,
  HelpText,
  Switch,
  Modal,
  Flex,
} from "@contentful/forma-36-react-components";
import { FieldExtensionSDK } from "contentful-ui-extensions-sdk";
import { v4 as uuid } from "uuid";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface FieldProps {
  sdk: FieldExtensionSDK;
}

const RelationsRepeaterField = (props: FieldProps) => {
  const fieldValue = props.sdk.field.getValue() || [];
  const initialRows = fieldValue
    ? fieldValue.map((value) => ({ ...value, key: uuid() }))
    : [];
  const [rows, setRows] = useState(initialRows);
  const instanceParameters = props.sdk.parameters.instance;
  const referenceKey = instanceParameters.referenceKey || "entryId";
  const quantity = instanceParameters.quantity || "quantity";
  const quantityLabel = instanceParameters.quantityLabel || "Quantity";
  const typeCode = instanceParameters.typeCode || "typeCode";
  const typeCodeLabel = instanceParameters.typeCodeLabel || "Type Code";
  const typeLabel = instanceParameters.typeLabel || "typeLabel";
  const typeLabelLabel = instanceParameters.typeLabelLabel || "Type Code Label";
  const defaultLocale = instanceParameters.defaultLocale || "en-GB";
  const contentTypes = instanceParameters.contentTypes
    ? instanceParameters.contentTypes.split(/\s*,\s*/g)
    : ["topicProduct"];
  const rowLimitToShow = 5;
  const [isActive, setActive] = useState(rows.length <= rowLimitToShow);
  const [isDisabled, setDisabled] = useState(false);
  const [activeLabel, setActiveLabel] = useState(
    rows.length <= rowLimitToShow
      ? `Hide (${rows.length} items)`
      : `Show (${rows.length} items)`
  );

  const [isDeleteAllConfirmShown, setDeleteAllConfirmShown] = useState(false);

  // use contentful's builtin auto-resizer
  useEffect(() => {
    props.sdk.window.startAutoResizer();
  });

  // check for unresolved names and fetch them from contenful if neccessary
  useEffect(() => {
    const unpopulatedRows = rows.filter((row) => !row.name);
    if (!unpopulatedRows.length) {
      return;
    }

    const allPopulatedRows = rows.map((row) => {
      if (!row.name) {
        row.name = row[referenceKey];
      }
      return row;
    });
    setRows(allPopulatedRows);

    // const referencedIds = unpopulatedRows.map((row) => row[referenceKey]);
    // props.sdk.space
    //   .getEntries({ "sys.id[in]": referencedIds.join(",") })
    //   .then((queryResult) => {
    //     let populatedRows = unpopulatedRows.map((row) => {
    //       const resultForCurrentRow = queryResult.items
    //         .filter((entry) => entry.sys.id === row[referenceKey])
    //         .pop();
    //         const newRow = {
    //           ...row,
    //         }
    //         newRow.name = resultForCurrentRow ? resultForCurrentRow.fields.code[defaultLocale] : "";
    //       return newRow;
    //     });

    //     const allPopulatedRows = rows.map(row => {
    //       if(!row.name){
    //         const populateRow = populatedRows.find(item => item.entryId === row.entryId)
    //         if(populateRow){
    //           row.name = populateRow.name;
    //         }
    //       }
    //       return row;
    //     })
    //     setRows(allPopulatedRows);
    //   });
  }, [rows, props.sdk.space, referenceKey, defaultLocale]);

  useLayoutEffect(() => {
    setDisabled(false);
  }, [rows, isActive]);

  // update contentful field value whenever rows data changes
  useEffect(() => {
    const sanitizedRows = rows.map((row) => {
      const sanitizedRow = {};
      sanitizedRow[quantity] = row[quantity] || "";
      sanitizedRow[typeCode] = row[typeCode] || "";
      sanitizedRow[typeLabel] = row[typeLabel] || "";
      sanitizedRow[referenceKey] = row[referenceKey] || "";
      return sanitizedRow;
    });
    props.sdk.field.setValue(sanitizedRows);
  }, [rows, props.sdk.field, referenceKey, quantity, typeCode, typeLabel]);

  // open entry selection dialog and append selected entries to the end of our list
  const onAddButtonClicked = () => {
    const options = {};
    if (contentTypes) {
      options.contentTypes = contentTypes;
    }
    props.sdk.dialogs
      .selectMultipleEntries(options)
      .then((selectedRows) => {
        setRows([
          ...rows,
          ...selectedRows.map((row) => {
            const rowData = {
              key: uuid(),
            };
            rowData[quantity] = "";
            rowData[typeCode] = "";
            rowData[typeLabel] = "";
            rowData[referenceKey] = row.sys.id;
            return rowData;
          }),
        ]);
      })
      .catch(() => {
        /* do nothing */
      });
  };

  // update text field with new value
  const onTextChanged = (currentTextKey, rowIndex, e) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][currentTextKey] = e.target.value;
    setRows(updatedRows);
  };

  // remove row from list
  const onDeleteButtonClicked = (passedRow) => {
    const updatedRows = rows.filter((row) => row !== passedRow);
    setRows(updatedRows);
  };

  // Called when row is re-ordered
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    setRows((prevRows) => {
      const result = Array.from(prevRows);
      const [removed] = result.splice(source.index, 1);
      result.splice(destination.index, 0, removed);
      return result;
    });
  };

  const onDeleteAllButtonClicked = () => {
    rows.splice(0, rows.length);
    setRows([]);
  };

  const ButtonDeleteAll = (props) => {
    if (props.rows.length && props.isActive) {
      return (
        <div>
          <Button
            onClick={() => setDeleteAllConfirmShown(true)}
            icon="Delete"
            buttonType="negative"
            size="small"
          >
            Delete all {props.id} items
          </Button>
          <Modal
            isShown={isDeleteAllConfirmShown}
            position="top"
            onClose={(e) => {
              setDeleteAllConfirmShown(false);
            }}
          >
            {({
              title,
              onClose,
            }: {
              title: string;
              onClose: MouseEventHandler;
            }) => (
              <Fragment>
                <Modal.Header title={title} onClose={onClose} />
                <Modal.Content>
                  Are you sure you want to delete all {props.id} items?
                </Modal.Content>
                <Modal.Controls position="right">
                  <Button onClick={onClose} buttonType="muted">
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      onClose();
                      onDeleteAllButtonClicked();
                      toggleActive();
                      setActive(true);
                    }}
                    buttonType="positive"
                  >
                    Confirm
                  </Button>
                </Modal.Controls>
              </Fragment>
            )}
          </Modal>
        </div>
      );
    }

    return null;
  };

  const toggleActive = (status) => {
    setDisabled(true);
    setActive(status);
    setActiveLabel(
      status ? `Hide (${rows.length} items)` : `Show (${rows.length} items)`
    );
  };

  const RepeaterHeader = () => {
    if (rows.length) {
      return (
        <div style={{ marginTop: "10px", marginBottom: "10px" }}>
          <Flex justifyContent="space-between" alignItems="center">
            <HelpText>
              {isActive
                ? "You can sort the rows by dragging them."
                : `${rows.length} items to show`}
            </HelpText>
            <Switch
              id="testSwitch"
              isChecked={isActive}
              isDisabled={isDisabled}
              onToggle={toggleActive}
              labelText={activeLabel}
            />
          </Flex>
        </div>
      );
    }
    return null;
  };

  const RepeaterComponents = (props) => {
    if (isActive) {
      return (
        <section>
          <div>
            <DragDropContext onDragEnd={(result) => onDragEnd(result)}>
              <Droppable droppableId="rows">
                {(provided) => {
                  return (
                    <div ref={provided.innerRef} className="rows">
                      {rows.map((row, index) => {
                        return (
                          <Draggable
                            key={`${row.id}-${index}`}
                            draggableId={`${row.id}-${index}`}
                            index={index}
                          >
                            {(provided) => {
                              return (
                                <div
                                  key={row.key}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  ref={provided.innerRef}
                                  style={{
                                    userSelect: "none",
                                    marginBottom: "10px",
                                    ...provided.draggableProps.style,
                                  }}
                                >
                                  <Card className="row">
                                    <div>
                                      <Paragraph>{index + 1}</Paragraph>
                                    </div>
                                    <div>
                                      <TextField
                                        value={row[quantity]}
                                        labelText={quantityLabel}
                                        placeholder={quantityLabel}
                                        data-index={index}
                                        onChange={(e) =>
                                          onTextChanged(quantity, index, e)
                                        }
                                      ></TextField>
                                    </div>
                                    <div>
                                      <TextField
                                        value={row[typeCode]}
                                        labelText={typeCodeLabel}
                                        placeholder={typeCodeLabel}
                                        data-index={index}
                                        onChange={(e) =>
                                          onTextChanged(typeCode, index, e)
                                        }
                                      ></TextField>
                                    </div>
                                    <div>
                                      <TextField
                                        value={row[typeLabel]}
                                        labelText={typeLabelLabel}
                                        placeholder={typeLabelLabel}
                                        data-index={index}
                                        onChange={(e) =>
                                          onTextChanged(typeLabel, index, e)
                                        }
                                      ></TextField>
                                    </div>
                                    <div style={{ width: "200px" }}>
                                      {row.name ? (
                                        <Paragraph>{row.name}</Paragraph>
                                      ) : (
                                        <SkeletonContainer svgHeight="20">
                                          <SkeletonBodyText numberOfLines="1"></SkeletonBodyText>
                                        </SkeletonContainer>
                                      )}
                                    </div>
                                    <div className="delete">
                                      <EditorToolbarButton
                                        icon="Delete"
                                        data-index={index}
                                        onClick={() =>
                                          onDeleteButtonClicked(row)
                                        }
                                      ></EditorToolbarButton>
                                    </div>
                                  </Card>
                                </div>
                              );
                            }}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  );
                }}
              </Droppable>
            </DragDropContext>
          </div>
          <div style={{ marginTop: "10px", marginBottom: "10px" }}>
            <Flex alignItems="center">
              <Button
                style={{ marginRight: "15px" }}
                icon="Plus"
                buttonType="naked"
                onClick={onAddButtonClicked}
              >
                Add
              </Button>

              <ButtonDeleteAll
                rows={rows}
                isActive={isActive}
                id={props.fieldId}
              />
            </Flex>
          </div>
        </section>
      );
    }
    return null;
  };

  return (
    <section>
      <RepeaterHeader />
      <RepeaterComponents fieldId={props.sdk.field.id} />
    </section>
  );
};

export default RelationsRepeaterField;
// https://contentful-pim-relations-field.netlify.app
