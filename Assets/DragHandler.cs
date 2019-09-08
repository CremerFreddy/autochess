using UnityEngine;
using System.Collections;
using UnityEngine.EventSystems;

public class DragHandler : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    public static GameObject itemBeingDragged;
    Vector3 startPosition;
    Transform startParent;
    public controlsManager controls;


    #region IBeginDragHandler implementation

    public void OnBeginDrag(PointerEventData eventData)
    {
        itemBeingDragged = gameObject;
        startPosition = transform.position;
        startParent = transform.parent;
        controls.cardSelected = true;
    }

    #endregion

    #region IDragHandler implementation

    public void OnDrag(PointerEventData eventData)
    {
        transform.position = eventData.position;
    }

    #endregion

    #region IEndDragHandler implementation

    public void OnEndDrag(PointerEventData eventData)
    {
        if (controls.selectedfield.locked == false)
        {
            controls.selectedfield.locked = true;
            GameObject obj = Instantiate(controls.myPrefab, new Vector3(controls.selectedfield.x, 1, controls.selectedfield.y), Quaternion.identity);
            AI objAI = obj.GetComponent<AI>();
            objAI.feld = controls.selectedfield;
            objAI.feld.onField = objAI;
            Destroy(itemBeingDragged);
        }
        
        controls.cardSelected = false;

    }

    #endregion



}
